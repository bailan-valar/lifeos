import type { Bill, ImportRecord, ImportRecordItem } from '~/types/bill'
import { getDB, now, onCollectionChange } from '~/services/db'

let _store: ImportRecordsStore | null = null
let _unsub: (() => void) | null = null

function startWatchingImportRecords() {
  if (_unsub) return
  _unsub = onCollectionChange('importRecords', () => {
    if (_store) _store.loadImportRecords()
  })
}

function stopWatchingImportRecords() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingImportRecords()
    startWatchingImportRecords()
    if (_store) _store.loadImportRecords()
  })
}

interface ImportRecordsStore {
  records: Ref<ImportRecord[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadImportRecords: (noteId?: string) => Promise<void>
  insertRecord: (record: ImportRecord) => Promise<void>
  updateRecord: (id: string, patch: Partial<ImportRecord>) => Promise<void>
  updateRecordItems: (id: string, items: ImportRecordItem[]) => Promise<void>
  deleteImportRecord: (id: string) => Promise<void>
  rollback: (id: string) => Promise<{ rolledBack: number; missing: number }>
  getById: (id: string) => ImportRecord | null
  fingerprintsAcrossRecords: ComputedRef<Set<string>>
  loadAllBillFingerprints: (noteId?: string) => Promise<Set<string>>
  loadAllBillFingerprintCounts: (noteId?: string) => Promise<Map<string, number>>
}

function createStore(): ImportRecordsStore {
  const records = ref<ImportRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadImportRecords(noteId?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      const result = await db.importRecords.find({
        selector,
        sort: [{ createdAt: 'desc' }]
      }).exec()
      records.value = result.map((doc: any) => doc.toJSON() as ImportRecord)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load import records:', e)
    } finally {
      loading.value = false
    }
  }

  async function insertRecord(record: ImportRecord) {
    const db = await getDB()
    await db.importRecords.insert({ ...record })
    records.value = [record, ...records.value]
  }

  async function updateRecord(id: string, patch: Partial<ImportRecord>) {
    const db = await getDB()
    const doc = await db.importRecords.findOne(id).exec()
    if (!doc) return
    const updated = { ...patch, updatedAt: now() }
    await doc.patch(updated)
    const idx = records.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      records.value[idx] = { ...records.value[idx], ...updated }
    }
  }

  async function updateRecordItems(id: string, items: ImportRecordItem[]) {
    await updateRecord(id, { items })
  }

  async function deleteImportRecord(id: string) {
    const db = await getDB()
    const doc = await db.importRecords.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    records.value = records.value.filter(r => r.id !== id)
  }

  async function rollback(id: string): Promise<{ rolledBack: number; missing: number }> {
    const db = await getDB()
    const doc = await db.importRecords.findOne(id).exec()
    if (!doc) return { rolledBack: 0, missing: 0 }
    const record = doc.toJSON() as ImportRecord
    if (record.status === 'rolled_back') return { rolledBack: 0, missing: 0 }

    let rolledBack = 0
    let missing = 0
    for (const billId of record.billIds) {
      const billDoc = await db.bills.findOne(billId).exec()
      if (!billDoc) {
        missing++
        continue
      }
      const bill = billDoc.toJSON() as Bill
      if (bill.type !== 'debt') {
        if (bill.fromAccountId) {
          const acc = await db.accounts.findOne(bill.fromAccountId).exec()
          if (acc) {
            await acc.patch({ balance: (acc.get('balance') as number) + bill.amount, updatedAt: now() })
          }
        }
        if (bill.toAccountId) {
          const acc = await db.accounts.findOne(bill.toAccountId).exec()
          if (acc) {
            await acc.patch({ balance: (acc.get('balance') as number) - bill.amount, updatedAt: now() })
          }
        }
      }
      await billDoc.remove()
      rolledBack++
    }

    const patchedItems: ImportRecordItem[] = record.items.map(item =>
      item.status === 'created' ? { ...item, status: 'failed', errorMessage: '已回滚', billId: undefined } : item
    )
    const patch = {
      status: 'rolled_back' as const,
      billIds: [],
      items: patchedItems,
      updatedAt: now()
    }
    await doc.patch(patch)

    const idx = records.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      records.value[idx] = { ...records.value[idx], ...patch }
    }

    return { rolledBack, missing }
  }

  function getById(id: string): ImportRecord | null {
    return records.value.find(r => r.id === id) ?? null
  }

  /**
   * 从数据库加载所有账单的指纹（用于去重判断）
   * 重新计算指纹为基于账户的格式，确保不同来源的账单能正确匹配
   */
  async function loadAllBillFingerprints(noteId?: string): Promise<Set<string>> {
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      // 只查询有 importFingerprint 的账单
      const result = await db.bills.find({
        selector: {
          ...selector,
          importFingerprint: { $exists: true }
        }
      }).exec()

      const set = new Set<string>()
      for (const doc of result) {
        const oldFingerprint = doc.get('importFingerprint') as string
        if (!oldFingerprint) continue

        // 获取账单信息
        const date = doc.get('date') as string
        const amount = doc.get('amount') as number
        const fromAccountId = doc.get('fromAccountId') as string
        const toAccountId = doc.get('toAccountId') as string

        if (!date || amount == null) {
          // 没有日期或金额，使用旧指纹
          set.add(oldFingerprint)
          continue
        }

        // 优先使用出账账户，其次使用入账账户
        const accountId = fromAccountId || toAccountId

        if (!accountId) {
          // 没有账户，使用旧指纹
          set.add(oldFingerprint)
          continue
        }

        // 重新计算基于账户的精确指纹
        // 从旧指纹中提取序号（如果有的话）
        const parts = oldFingerprint.split('|')
        const index = parts.length >= 4 ? parseInt(parts[3], 10) : 0

        // date 格式可能是 "2024-01-01T12:00:00.000Z"，需要只取日期部分
        const datePart = date.slice(0, 10)

        // 生成新的精确指纹：accountId|date|amount|index
        const newFingerprint = `${accountId}|${datePart}|${amount.toFixed(2)}|${index}`
        set.add(newFingerprint)
      }
      return set
    } catch (e) {
      console.error('Failed to load bill fingerprints:', e)
      return new Set<string>()
    }
  }

  /**
   * 从数据库加载按账户统计的指纹数量（用于招商信用卡去重）
   * 返回 Map<baseFingerprint, count>
   * baseFingerprint 格式：accountId|date|amount
   *
   * 注意：这里需要重新计算指纹，因为旧账单的指纹可能是基于来源的
   * 新逻辑要求所有账单都使用基于账户的指纹
   */
  async function loadAllBillFingerprintCounts(noteId?: string): Promise<Map<string, number>> {
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      // 查询所有有 importFingerprint 的账单
      const result = await db.bills.find({
        selector: {
          ...selector,
          importFingerprint: { $exists: true }
        }
      }).exec()

      const countMap = new Map<string, number>()
      for (const doc of result) {
        const fp = doc.get('importFingerprint') as string
        if (!fp) continue

        // 获取账单信息
        const date = doc.get('date') as string
        const amount = doc.get('amount') as number
        const fromAccountId = doc.get('fromAccountId') as string
        const toAccountId = doc.get('toAccountId') as string

        if (!date || amount == null) continue

        // 优先使用出账账户，其次使用入账账户
        const accountId = fromAccountId || toAccountId

        if (!accountId) {
          // 没有账户，使用旧指纹格式
          const parts = fp.split('|')
          if (parts.length >= 3) {
            const baseFingerprint = parts.slice(0, 3).join('|')
            const count = countMap.get(baseFingerprint) || 0
            countMap.set(baseFingerprint, count + 1)
          }
          continue
        }

        // 重新计算基于账户的基础指纹：accountId|date|amount
        // date 格式可能是 "2024-01-01T12:00:00.000Z"，需要只取日期部分
        const datePart = date.slice(0, 10)
        const baseFingerprint = `${accountId}|${datePart}|${amount.toFixed(2)}`

        const count = countMap.get(baseFingerprint) || 0
        countMap.set(baseFingerprint, count + 1)
      }
      return countMap
    } catch (e) {
      console.error('Failed to load bill fingerprint counts:', e)
      return new Map<string, number>()
    }
  }

  const fingerprintsAcrossRecords = computed(() => {
    const set = new Set<string>()
    for (const record of records.value) {
      if (record.status === 'rolled_back') continue
      for (const item of record.items) {
        if (item.fingerprint) set.add(item.fingerprint)
      }
    }
    return set
  })

  return {
    records,
    loading,
    error,
    loadImportRecords,
    insertRecord,
    updateRecord,
    updateRecordItems,
    deleteImportRecord,
    rollback,
    getById,
    fingerprintsAcrossRecords,
    loadAllBillFingerprints,
    loadAllBillFingerprintCounts
  }
}

export function useImportRecords(): ImportRecordsStore {
  if (!_store) {
    _store = createStore()
  }
  startWatchingImportRecords()
  return _store
}
