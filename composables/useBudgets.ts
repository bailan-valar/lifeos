import type { BudgetEntry, BudgetFormData, BudgetCycleType } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

interface BudgetsStore {
  budgets: Ref<BudgetEntry[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadBudgets: () => Promise<void>
  upsertBudget: (data: BudgetFormData) => Promise<BudgetEntry>
  deleteBudget: (id: string) => Promise<void>
  resolveBudget: (categoryId: string, year: number, month: number) => { cycleType: BudgetCycleType; amount: number } | null
  resolveYear: (categoryId: string, year: number) => Array<{ month: number; cycleType: BudgetCycleType; amount: number } | null>
  getYearCycleType: (categoryId: string, year: number) => BudgetCycleType | 'mixed' | null
  getMonthlyEquivalent: (categoryId: string, year: number, month: number) => number
  getCategoryBudgetEntries: (categoryId: string) => BudgetEntry[]
}

let store: BudgetsStore | null = null

function createStore(): BudgetsStore {
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

      const raw = result.map((doc: any) => doc.toJSON())
      const valid: BudgetEntry[] = []
      const staleIds: string[] = []

      for (const b of raw) {
        if (
          typeof b.effectiveFromYear === 'number' &&
          typeof b.effectiveFromMonth === 'number' &&
          (b.cycleType === 'monthly' || b.cycleType === 'yearly')
        ) {
          valid.push(b as BudgetEntry)
        } else if (b.id) {
          staleIds.push(b.id)
        }
      }

      for (const id of staleIds) {
        try {
          const doc = await db.budgets.findOne(id).exec()
          if (doc) await doc.remove()
        } catch {
          /* ignore */
        }
      }

      budgets.value = valid
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load budgets:', e)
    } finally {
      loading.value = false
    }
  }

  async function upsertBudget(data: BudgetFormData): Promise<BudgetEntry> {
    const db = await getDb()
    const existing = budgets.value.find(
      b =>
        b.categoryId === data.categoryId &&
        b.effectiveFromYear === data.effectiveFromYear &&
        b.effectiveFromMonth === data.effectiveFromMonth
    )

    if (existing) {
      const doc = await db.budgets.findOne(existing.id).exec()
      if (doc) {
        await doc.patch({ ...data, updatedAt: now() })
        const idx = budgets.value.findIndex(b => b.id === existing.id)
        if (idx !== -1) {
          budgets.value[idx] = { ...budgets.value[idx], ...data, updatedAt: now() }
        }
        return budgets.value[idx]
      }
    }

    const budget: BudgetEntry = {
      id: generateId(),
      categoryId: data.categoryId,
      effectiveFromYear: data.effectiveFromYear,
      effectiveFromMonth: data.effectiveFromMonth,
      cycleType: data.cycleType,
      amount: data.amount,
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.budgets.insert({ ...budget })
    budgets.value.push(budget)
    return budget
  }

  async function deleteBudget(id: string) {
    const db = await getDb()
    const doc = await db.budgets.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    budgets.value = budgets.value.filter(b => b.id !== id)
  }

  function resolveBudget(
    categoryId: string,
    year: number,
    month: number
  ): { cycleType: BudgetCycleType; amount: number } | null {
    const entries = budgets.value
      .filter(b => b.categoryId === categoryId)
      .sort((a, b) => {
        const aTime = a.effectiveFromYear * 12 + a.effectiveFromMonth
        const bTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
        return aTime - bTime
      })

    const target = year * 12 + month
    let result: BudgetEntry | null = null

    for (const entry of entries) {
      const entryTime = entry.effectiveFromYear * 12 + entry.effectiveFromMonth
      if (entryTime <= target) {
        result = entry
      } else {
        break
      }
    }

    if (!result) return null
    return { cycleType: result.cycleType, amount: result.amount }
  }

  function resolveYear(
    categoryId: string,
    year: number
  ): Array<{ month: number; cycleType: BudgetCycleType; amount: number } | null> {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const cfg = resolveBudget(categoryId, year, month)
      return cfg ? { month, ...cfg } : null
    })
  }

  function getYearCycleType(
    categoryId: string,
    year: number
  ): BudgetCycleType | 'mixed' | null {
    const configs = resolveYear(categoryId, year)
    const hasMonthly = configs.some(c => c?.cycleType === 'monthly')
    const hasYearly = configs.some(c => c?.cycleType === 'yearly')

    if (hasMonthly && hasYearly) return 'mixed'
    if (hasMonthly) return 'monthly'
    if (hasYearly) return 'yearly'
    return null
  }

  function getMonthlyEquivalent(categoryId: string, year: number, month: number): number {
    const config = resolveBudget(categoryId, year, month)
    if (!config) return 0
    if (config.cycleType === 'yearly') return config.amount / 12
    return config.amount
  }

  function getCategoryBudgetEntries(categoryId: string): BudgetEntry[] {
    return budgets.value
      .filter(b => b.categoryId === categoryId)
      .sort((a, b) => {
        const aTime = a.effectiveFromYear * 12 + a.effectiveFromMonth
        const bTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
        return aTime - bTime
      })
  }

  return {
    budgets,
    loading,
    error,
    loadBudgets,
    upsertBudget,
    deleteBudget,
    resolveBudget,
    resolveYear,
    getYearCycleType,
    getMonthlyEquivalent,
    getCategoryBudgetEntries
  }
}

export function useBudgets(): BudgetsStore {
  if (!store) {
    store = createStore()
  }
  return store
}
