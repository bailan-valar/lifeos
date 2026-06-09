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
   * 只查询 importFingerprint 字段，不加载完整账单数据
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
        },
        // 只返回指纹字段，减少数据传输
        fields: ['importFingerprint']
      }).exec()

      const set = new Set<string>()
      for (const doc of result) {
        const fp = doc.get('importFingerprint') as string
        if (fp) set.add(fp)
      }
      return set
    } catch (e) {
      console.error('Failed to load bill fingerprints:', e)
      return new Set<string>()
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
    loadAllBillFingerprints
  }
}

export function useImportRecords(): ImportRecordsStore {
  if (!_store) {
    _store = createStore()
  }
  startWatchingImportRecords()
  return _store
}
