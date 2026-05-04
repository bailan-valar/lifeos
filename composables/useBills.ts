import type { Bill, BillFormData } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

async function updateAccountBalance(id: string, delta: number) {
  if (!id) return
  const db = await getDb()
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

export function useBills() {
  const bills = ref<Bill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadBills(noteId?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDb()
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
      const db = await getDb()
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

  async function createBill(data: BillFormData, noteId?: string): Promise<Bill> {
    const db = await getDb()
    const bill: Bill = {
      id: generateId(),
      noteId: noteId || '',
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      fromAccountId: data.fromAccountId || '',
      toAccountId: data.toAccountId || '',
      categoryId: data.categoryId || '',
      title: data.title,
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

  async function updateBill(id: string, data: Partial<BillFormData>) {
    const db = await getDb()
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

  async function deleteBill(id: string) {
    const db = await getDb()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const bill = doc.toJSON() as Bill

    await applyBalanceChange(bill, true)
    await doc.remove()
    bills.value = bills.value.filter(b => b.id !== id)
  }

  async function settleDebt(id: string, settleAmount: number) {
    const db = await getDb()
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
    totalIncome,
    totalExpense,
    totalTransfer,
    netBalance,
    loadBills,
    loadBillsForNotes,
    createBill,
    updateBill,
    deleteBill,
    settleDebt
  }
}
