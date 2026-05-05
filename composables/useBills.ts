import type {
  Bill,
  BillFormData,
  ImportPreviewRow,
  ImportRecord,
  ImportRecordItem,
  ImportRecordStatus,
  ImportSource
} from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'
import { dedupeKey } from '~/services/csvImport'
import { useImportRecords } from '~/composables/useImportRecords'

async function updateAccountBalance(id: string, delta: number) {
  if (!id) return
  const db = await getDB()
  const doc = await db.accounts.findOne(id).exec()
  if (!doc) return
  const newBalance = (doc.get('balance') as number) + delta
  await doc.patch({ balance: newBalance, updatedAt: now() })
}

async function applyBalanceChange(bill: Bill, reverse = false) {
  if (bill.type === 'debt') return
  const m = reverse ? -1 : 1
  if (bill.fromAccountId) await updateAccountBalance(bill.fromAccountId, -bill.amount * m)
  if (bill.toAccountId) await updateAccountBalance(bill.toAccountId, bill.amount * m)
}

function toIsoMinutes(date: string): string {
  return date.length >= 16 ? date.slice(0, 16).replace(' ', 'T') : date
}

function rowToBillFormData(row: ImportPreviewRow): BillFormData {
  return {
    noteId: '',
    type: row.type,
    amount: row.amount,
    currency: 'CNY',
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    categoryId: row.categoryId,
    description: row.description,
    date: toIsoMinutes(row.date),
    debtSubtype: row.debtSubtype,
    relatedPersonId: ''
  }
}

export function useBills() {
  const bills = ref<Bill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const pageSize = ref(50)
  const currentPage = ref(1)

  async function loadBills(noteId?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsForNotes(noteIds: string[]) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      if (noteIds.length === 0) {
        bills.value = []
        return
      }
      const selector: Record<string, unknown> = noteIds.length === 1
        ? { noteId: noteIds[0] }
        : { noteId: { $in: noteIds } }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills for notes:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsPaginated(noteId?: string, page = 1) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }],
        limit: pageSize.value,
        skip: (page - 1) * pageSize.value
      }).exec()
      const items = result.map((doc: any) => doc.toJSON())
      if (page === 1) bills.value = items
      else bills.value.push(...items)
      hasMore.value = items.length === pageSize.value
      currentPage.value = page
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills paginated:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadMoreBills(noteId?: string) {
    if (!hasMore.value || loading.value) return
    await loadBillsPaginated(noteId, currentPage.value + 1)
  }

  async function loadBillsByDateRange(noteId?: string, startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      if (startDate || endDate) {
        selector.date = {}
        if (startDate) selector.date.$gte = startDate
        if (endDate) selector.date.$lte = endDate
      }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
      hasMore.value = false
      currentPage.value = 1
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills by date range:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillStats(noteId?: string, startDate?: string, endDate?: string) {
    const db = await getDB()
    const selector: Record<string, unknown> = { status: 'completed' }
    if (noteId) selector.noteId = noteId
    if (startDate || endDate) {
      selector.date = {}
      if (startDate) selector.date.$gte = startDate
      if (endDate) selector.date.$lte = endDate
    }
    const result = await db.bills.find({ selector }).exec()
    const items = result.map((doc: any) => doc.toJSON() as Bill)
    const income = items.filter(b => b.type === 'income').reduce((sum, b) => sum + b.amount, 0)
    const expense = items.filter(b => b.type === 'expense').reduce((sum, b) => sum + b.amount, 0)
    const transfer = items.filter(b => b.type === 'transfer').reduce((sum, b) => sum + b.amount, 0)
    return { income, expense, transfer, net: income - expense }
  }

  async function createBill(data: BillFormData, noteId?: string): Promise<Bill> {
    const db = await getDB()
    const bill: Bill = {
      id: generateId(),
      noteId: data.noteId || noteId || '',
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      fromAccountId: data.fromAccountId || '',
      toAccountId: data.toAccountId || '',
      categoryId: data.categoryId || '',
      description: data.description || '',
      date: data.date,
      status: 'completed',
      debtSubtype: data.debtSubtype || '',
      relatedPersonId: data.relatedPersonId || '',
      settledAmount: 0,
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.bills.insert({ ...bill })
    await applyBalanceChange(bill, false)
    bills.value.push(bill)
    return bill
  }

  async function createBillsBatch(
    payload: {
      rows: ImportPreviewRow[]
      fileName: string
      fileSize: number
      source: ImportSource
    },
    noteId: string
  ): Promise<ImportRecord> {
    const db = await getDB()
    const startedAt = now()
    const batchId = generateId()
    const items: ImportRecordItem[] = []
    const billIds: string[] = []
    let successCount = 0
    let skippedCount = 0
    let failedCount = 0

    const selectedRows = payload.rows.filter(r => r.selected)
    const selectedCount = selectedRows.length

    for (const row of payload.rows) {
      const fingerprint = dedupeKey(row.date, row.amount, row.counterparty)

      if (row.skipped) {
        skippedCount++
        items.push({
          rawIndex: row.rawIndex,
          date: row.date,
          counterparty: row.counterparty,
          amount: row.amount,
          direction: row.direction,
          fingerprint,
          status: 'skipped_unselected',
          matchedRuleId: row.matchedRuleId
        })
        continue
      }

      if (!row.selected) {
        skippedCount++
        items.push({
          rawIndex: row.rawIndex,
          date: row.date,
          counterparty: row.counterparty,
          amount: row.amount,
          direction: row.direction,
          fingerprint,
          status: row.duplicate ? 'skipped_duplicate' : 'skipped_unselected',
          matchedRuleId: row.matchedRuleId
        })
        continue
      }

      try {
        const data = rowToBillFormData(row)
        if (data.amount <= 0) throw new Error('金额必须大于 0')
        const billId = generateId()
        const bill: Bill = {
          id: billId,
          noteId,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          fromAccountId: data.fromAccountId || '',
          toAccountId: data.toAccountId || '',
          categoryId: data.categoryId || '',
          description: data.description || '',
          date: data.date,
          status: 'completed',
          debtSubtype: data.debtSubtype || 'lend',
          relatedPersonId: '',
          settledAmount: 0,
          importBatchId: batchId,
          importSource: payload.source,
          importFingerprint: fingerprint,
          counterpartyRaw: row.counterparty,
          createdAt: now(),
          updatedAt: now(),
          isSynced: false
        }
        await db.bills.insert({ ...bill })
        await applyBalanceChange(bill, false)
        bills.value.push(bill)
        billIds.push(billId)
        successCount++
        items.push({
          rawIndex: row.rawIndex,
          date: row.date,
          counterparty: row.counterparty,
          amount: row.amount,
          direction: row.direction,
          fingerprint,
          status: 'created',
          billId,
          matchedRuleId: row.matchedRuleId
        })
      } catch (e) {
        failedCount++
        items.push({
          rawIndex: row.rawIndex,
          date: row.date,
          counterparty: row.counterparty,
          amount: row.amount,
          direction: row.direction,
          fingerprint,
          status: 'failed',
          matchedRuleId: row.matchedRuleId,
          errorMessage: e instanceof Error ? e.message : String(e)
        })
      }
    }

    const finishedAt = now()
    const status: ImportRecordStatus =
      successCount === 0 && selectedCount > 0
        ? 'failed'
        : failedCount > 0
          ? 'partial'
          : 'success'

    const record: ImportRecord = {
      id: batchId,
      noteId,
      source: payload.source,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      totalParsed: payload.rows.length,
      selectedCount,
      successCount,
      skippedCount,
      failedCount,
      status,
      billIds,
      items,
      startedAt,
      finishedAt,
      createdAt: finishedAt,
      updatedAt: finishedAt,
      isSynced: false
    }

    await useImportRecords().insertRecord(record)
    return record
  }

  async function updateBill(id: string, data: Partial<BillFormData>) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const oldBill = doc.toJSON() as Bill

    await applyBalanceChange(oldBill, true)

    const patch: Partial<Bill> = {
      ...data,
      updatedAt: now()
    }
    await doc.patch(patch)

    const newBill = { ...oldBill, ...patch } as Bill
    await applyBalanceChange(newBill, false)

    const idx = bills.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      bills.value[idx] = newBill
    }
  }

  async function updateBills(ids: string[], data: Partial<BillFormData>) {
    const db = await getDB()
    let updatedCount = 0
    const failedIds: string[] = []

    for (const id of ids) {
      try {
        const doc = await db.bills.findOne(id).exec()
        if (!doc) {
          failedIds.push(id)
          continue
        }
        const oldBill = doc.toJSON() as Bill

        await applyBalanceChange(oldBill, true)

        const patch: Partial<Bill> = {
          ...data,
          updatedAt: now()
        }
        await doc.patch(patch)

        const newBill = { ...oldBill, ...patch } as Bill
        await applyBalanceChange(newBill, false)

        const idx = bills.value.findIndex(b => b.id === id)
        if (idx !== -1) {
          bills.value[idx] = newBill
        }
        updatedCount++
      } catch (e) {
        console.error(`Failed to update bill ${id}:`, e)
        failedIds.push(id)
      }
    }

    return { updatedCount, failedIds }
  }

  async function deleteBill(id: string) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const bill = doc.toJSON() as Bill

    await applyBalanceChange(bill, true)
    await doc.remove()
    bills.value = bills.value.filter(b => b.id !== id)
  }

  async function deleteBills(ids: string[]) {
    const db = await getDB()
    const docs: any[] = []
    const validBills: Bill[] = []

    for (const id of ids) {
      const doc = await db.bills.findOne(id).exec()
      if (doc) {
        docs.push(doc)
        validBills.push(doc.toJSON() as Bill)
      }
    }

    if (validBills.length === 0) return { deletedCount: 0 }

    await Promise.all(validBills.map(bill => applyBalanceChange(bill, true)))
    await Promise.all(docs.map((doc: any) => doc.remove()))

    const deletedIds = new Set(validBills.map(b => b.id))
    bills.value = bills.value.filter(b => !deletedIds.has(b.id))

    return { deletedCount: validBills.length }
  }

  async function settleDebt(id: string, settleAmount: number) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const bill = doc.toJSON() as Bill
    if (bill.type !== 'debt') return

    const newSettled = bill.settledAmount + settleAmount
    const newStatus = newSettled >= bill.amount ? 'completed' : 'pending'

    await doc.patch({
      settledAmount: newSettled,
      status: newStatus,
      updatedAt: now()
    })

    const idx = bills.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      bills.value[idx].settledAmount = newSettled
      bills.value[idx].status = newStatus as Bill['status']
      bills.value[idx].updatedAt = now()
    }
  }

  const totalIncome = computed(() =>
    bills.value
      .filter(b => b.type === 'income' && b.status === 'completed')
      .reduce((sum, b) => sum + b.amount, 0)
  )

  const totalExpense = computed(() =>
    bills.value
      .filter(b => b.type === 'expense' && b.status === 'completed')
      .reduce((sum, b) => sum + b.amount, 0)
  )

  const totalTransfer = computed(() =>
    bills.value
      .filter(b => b.type === 'transfer' && b.status === 'completed')
      .reduce((sum, b) => sum + b.amount, 0)
  )

  const netBalance = computed(() => totalIncome.value - totalExpense.value)

  return {
    bills,
    loading,
    error,
    hasMore,
    pageSize,
    currentPage,
    totalIncome,
    totalExpense,
    totalTransfer,
    netBalance,
    loadBills,
    loadBillsForNotes,
    loadBillsPaginated,
    loadMoreBills,
    loadBillsByDateRange,
    loadBillStats,
    createBill,
    createBillsBatch,
    updateBill,
    updateBills,
    deleteBill,
    deleteBills,
    settleDebt
  }
}
