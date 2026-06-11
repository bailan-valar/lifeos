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
   * 使用新格式：date|amount|fromId?|toId?|index
   * 商户/其他/空账户不参与指纹
   */
  async function loadAllBillFingerprints(noteId?: string): Promise<Set<string>> {
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      // 查询所有账单（不仅仅是有 importFingerprint 的）
      const result = await db.bills.find({
        selector
      }).exec()

      const set = new Set<string>()
      for (const doc of result) {
        // 获取账单信息
        const date = doc.get('date') as string
        const amount = doc.get('amount') as number
        const fromAccountId = doc.get('fromAccountId') as string
        const toAccountId = doc.get('toAccountId') as string

        if (!date || amount == null) continue

        // 获取账户类型
        const fromAccount = fromAccountId ? await db.accounts.findOne(fromAccountId).exec() : null
        const toAccount = toAccountId ? await db.accounts.findOne(toAccountId).exec() : null
        const fromAccountType = fromAccount?.get('type') as string | undefined
        const toAccountType = toAccount?.get('type') as string | undefined

        // 构建指纹
        const datePart = date.slice(0, 10)
        const parts = [datePart, amount.toFixed(2)]

        // 只添加有效的账户（非商户、非其他、非空）
        if (fromAccountId && fromAccountType !== 'merchant' && fromAccountType !== 'other' && fromAccountType !== 'contact') {
          parts.push(fromAccountId)
        }
        if (toAccountId && toAccountType !== 'merchant' && toAccountType !== 'other' && toAccountType !== 'contact') {
          parts.push(toAccountId)
        }

        // 添加序号（每个账单的序号固定为 0，因为旧账单没有序号概念）
        parts.push('0')

        const newFingerprint = parts.join('|')
        set.add(newFingerprint)
      }
      return set
    } catch (e) {
      console.error('Failed to load bill fingerprints:', e)
      return new Set<string>()
    }
  }

  /**
   * 从数据库加载按基础指纹统计的数量（用于计算序号）
   * 返回 Map<baseFingerprint, count>
   * baseFingerprint 格式：date|amount|fromId?|toId?
   *
   * 商户/其他/空账户不参与指纹
   */
  async function loadAllBillFingerprintCounts(noteId?: string): Promise<Map<string, number>> {
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      // 查询所有账单
      const result = await db.bills.find({
        selector
      }).exec()

      const countMap = new Map<string, number>()
      for (const doc of result) {
        // 获取账单信息
        const date = doc.get('date') as string
        const amount = doc.get('amount') as number
        const fromAccountId = doc.get('fromAccountId') as string
        const toAccountId = doc.get('toAccountId') as string

        if (!date || amount == null) continue

        // 获取账户类型
        const fromAccount = fromAccountId ? await db.accounts.findOne(fromAccountId).exec() : null
        const toAccount = toAccountId ? await db.accounts.findOne(toAccountId).exec() : null
        const fromAccountType = fromAccount?.get('type') as string | undefined
        const toAccountType = toAccount?.get('type') as string | undefined

        // 构建基础指纹（不带序号）
        const datePart = date.slice(0, 10)
        const parts = [datePart, amount.toFixed(2)]

        // 只添加有效的账户（非商户、非其他、非空）
        if (fromAccountId && fromAccountType !== 'merchant' && fromAccountType !== 'other' && fromAccountType !== 'contact') {
          parts.push(fromAccountId)
        }
        if (toAccountId && toAccountType !== 'merchant' && toAccountType !== 'other' && toAccountType !== 'contact') {
          parts.push(toAccountId)
        }

        const baseFingerprint = parts.join('|')
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
