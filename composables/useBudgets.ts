import type { BudgetEntry, BudgetFormData } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

export function useBudgets() {
  const budgets = ref<BudgetEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadBudgets() {
    loading.value = true
    error.value = null
    try {
      const db = await getDb()
      const result = await db.budgets.find({
        sort: [{ createdAt: 'asc' }]
      }).exec()
      budgets.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load budgets:', e)
    } finally {
      loading.value = false
    }
  }

  async function createBudget(data: BudgetFormData): Promise<BudgetEntry> {
    const db = await getDb()
    const budget: BudgetEntry = {
      id: generateId(),
      categoryId: data.categoryId,
      period: data.period,
      amount: data.amount,
      year: data.year,
      month: data.month ?? null,
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.budgets.insert({ ...budget })
    budgets.value.push(budget)
    return budget
  }

  async function updateBudget(id: string, data: Partial<BudgetFormData>) {
    const db = await getDb()
    const doc = await db.budgets.findOne(id).exec()
    if (!doc) return
    await doc.patch({ ...data, updatedAt: now() })
    const idx = budgets.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      budgets.value[idx] = { ...budgets.value[idx], ...data, updatedAt: now() }
    }
  }

  async function deleteBudget(id: string) {
    const db = await getDb()
    const doc = await db.budgets.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    budgets.value = budgets.value.filter(b => b.id !== id)
  }

  function getBudgetAmount(categoryId: string, year: number, month: number): number {
    const monthly = budgets.value.find(b =>
      b.categoryId === categoryId && b.period === 'monthly' && b.year === year && b.month === month
    )
    if (monthly) return monthly.amount

    const yearly = budgets.value.find(b =>
      b.categoryId === categoryId && b.period === 'yearly' && b.year === year
    )
    if (yearly) return yearly.amount / 12

    return 0
  }

  const monthlyBudgets = computed(() => budgets.value.filter(b => b.period === 'monthly'))
  const yearlyBudgets = computed(() => budgets.value.filter(b => b.period === 'yearly'))

  return {
    budgets,
    loading,
    error,
    loadBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetAmount,
    monthlyBudgets,
    yearlyBudgets
  }
}
