import type {
  Bill,
  BillFormData,
  ImportRecord,
  ImportRecordItem,
  ImportRecordItemStatus,
  ImportRecordStatus
} from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { dedupeKey } from '~/services/csvImport'
import { useImportRecords } from '~/composables/useImportRecords'
import { maybeRecalculateBalance, recalculateBalance } from '~/composables/useBalanceAdjustments'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

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

export function useBills() {
  const bills = ref<Bill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const pageSize = ref(50)
  const currentPage = ref(1)

  let unsubscribe: (() => void) | null = null
  let lastReloadContext: {
    type: 'all' | 'noteId' | 'noteIds' | 'paginated' | 'category' | 'dateRange' | 'account'
    noteId?: string
    noteIds?: string[]
    categoryId?: string
    accountId?: string
    startDate?: string
    endDate?: string
  } | null = null

  async function loadBills(noteId?: string) {
    lastReloadContext = { type: noteId ? 'noteId' : 'all', noteId }
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

  async function reloadFromRemote() {
    if (!lastReloadContext) {
      await loadBills()
      return
    }
    switch (lastReloadContext.type) {
      case 'all':
        await loadBills()
        break
      case 'noteId':
        await loadBills(lastReloadContext.noteId)
        break
      case 'noteIds':
        if (lastReloadContext.noteIds) await loadBillsForNotes(lastReloadContext.noteIds)
        else await loadBills()
        break
      case 'paginated':
        await loadBillsPaginated(lastReloadContext.noteId, 1)
        break
      case 'category':
        await loadBillsByCategory(
          lastReloadContext.categoryId || '',
          lastReloadContext.noteId,
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      case 'dateRange':
        await loadBillsByDateRange(
          lastReloadContext.noteId,
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      case 'account':
        await loadBillsByAccount(
          lastReloadContext.accountId || '',
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      default:
        await loadBills()
    }
  }

  async function loadBillsForNotes(noteIds: string[]) {
    lastReloadContext = { type: 'noteIds', noteIds }
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
    lastReloadContext = { type: 'paginated', noteId }
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

  async function loadBillsByCategory(categoryId: string, noteId?: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'category', categoryId, noteId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = { categoryId }
      if (noteId) selector.noteId = noteId
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
      console.error('Failed to load bills by category:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsByDateRange(noteId?: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'dateRange', noteId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = noteId ? { noteId } : {}
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

  async function loadBillsByAccount(accountId: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'account', accountId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = {
        $or: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      }
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
      console.error('Failed to load bills by account:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillStats(noteId?: string, startDate?: string, endDate?: string) {
    const db = await getDB()
    const selector: Record<string, any> = { status: 'completed' }
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
    }
    await db.bills.insert({ ...bill })
    await applyBalanceChange(bill, false)
    await maybeRecalculateBalance(bill.fromAccountId, bill.date)
    await maybeRecalculateBalance(bill.toAccountId, bill.date)
    bills.value.push(bill)
    return bill
  }

  async function createBillsBatch(
    record: ImportRecord,
    noteId: string
  ): Promise<ImportRecord> {
    const db = await getDB()
    const billIds: string[] = []
    let successCount = 0
    let skippedCount = 0
    let failedCount = 0

    const items: ImportRecordItem[] = []
    const affectedAccountIds = new Set<string>()

    for (const item of record.items) {
      const fingerprint = item.fingerprint || dedupeKey(item.date, item.amount, item.counterparty)
      const base = { ...item, fingerprint }

      if (item.skipped) {
        skippedCount++
        items.push({ ...base, status: 'skipped_unselected' as ImportRecordItemStatus })
        continue
      }

      if (!item.selected) {
        skippedCount++
        const status: ImportRecordItemStatus = item.duplicate ? 'skipped_duplicate' : 'skipped_unselected'
        items.push({ ...base, status })
        continue
      }

      try {
        if (item.amount <= 0) throw new Error('金额必须大于 0')
        const billId = generateId()
        const bill: Bill = {
          id: billId,
          noteId,
          type: item.type || 'expense',
          amount: item.amount,
          currency: 'CNY',
          fromAccountId: item.fromAccountId || '',
          toAccountId: item.toAccountId || '',
          categoryId: item.categoryId || '',
          description: item.description || '',
          date: toIsoMinutes(item.date),
          status: 'completed',
          debtSubtype: item.debtSubtype || 'lend',
          relatedPersonId: '',
          settledAmount: 0,
          importBatchId: record.id,
          importSource: record.source,
          importFingerprint: fingerprint,
          counterpartyRaw: item.counterparty,
          createdAt: now(),
          updatedAt: now(),
        }
        await db.bills.insert({ ...bill })
        await applyBalanceChange(bill, false)
        if (bill.fromAccountId) affectedAccountIds.add(bill.fromAccountId)
        if (bill.toAccountId) affectedAccountIds.add(bill.toAccountId)
        bills.value.push(bill)
        billIds.push(billId)
        successCount++
        items.push({ ...base, status: 'created' as ImportRecordItemStatus, billId })
      } catch (e) {
        failedCount++
        items.push({
          ...base,
          status: 'failed' as ImportRecordItemStatus,
          errorMessage: e instanceof Error ? e.message : String(e)
        })
      }
    }

    const selectedCount = record.items.filter(i => i.selected).length
    const finishedAt = now()
    const status: ImportRecordStatus =
      successCount === 0 && selectedCount > 0
        ? 'failed'
        : failedCount > 0
          ? 'partial'
          : 'success'

    const patch: Partial<ImportRecord> = {
      status,
      billIds,
      items,
      selectedCount,
      successCount,
      skippedCount,
      failedCount,
      finishedAt,
      updatedAt: finishedAt
    }

    await useImportRecords().updateRecord(record.id, patch)
    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
    }
    return { ...record, ...patch }
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
    await maybeRecalculateBalance(newBill.fromAccountId, newBill.date)
    await maybeRecalculateBalance(newBill.toAccountId, newBill.date)

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

    const affectedAccountIds = new Set<string>()
    for (const id of ids) {
      const bill = bills.value.find(b => b.id === id)
      if (bill) {
        if (bill.fromAccountId) affectedAccountIds.add(bill.fromAccountId)
        if (bill.toAccountId) affectedAccountIds.add(bill.toAccountId)
      }
    }
    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
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
    await maybeRecalculateBalance(bill.fromAccountId, bill.date)
    await maybeRecalculateBalance(bill.toAccountId, bill.date)
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

    const affectedAccountIds = new Set<string>()
    for (const bill of validBills) {
      if (bill.fromAccountId) affectedAccountIds.add(bill.fromAccountId)
      if (bill.toAccountId) affectedAccountIds.add(bill.toAccountId)
    }
    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
    }

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

  function startWatching() {
    if (unsubscribe) return
    unsubscribe = onCollectionChange('bills', () => {
      reloadFromRemote()
    })
  }

  function stopWatching() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  if (getCurrentInstance()) {
    onMounted(startWatching)
    onUnmounted(stopWatching)
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
    loadBillsByCategory,
    loadBillsByDateRange,
    loadBillsByAccount,
    loadBillStats,
    createBill,
    createBillsBatch,
    updateBill,
    updateBills,
    deleteBill,
    deleteBills,
    settleDebt,
    startWatching,
    stopWatching,
    reloadFromRemote
  }
}
