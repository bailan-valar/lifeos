import type { BudgetEntry, BudgetFormData, BudgetCycleType } from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { div } from '~/utils/decimal'

interface BudgetsStore {
  budgets: Ref<BudgetEntry[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadBudgets: (noteId?: string) => Promise<void>
  upsertBudget: (data: BudgetFormData) => Promise<BudgetEntry>
  deleteBudget: (id: string) => Promise<void>
  resolveBudget: (categoryId: string, year: number, month: number, noteId?: string) => { cycleType: BudgetCycleType; amount: number } | null
  resolveYear: (categoryId: string, year: number, noteId?: string) => Array<{ month: number; cycleType: BudgetCycleType; amount: number } | null>
  getYearCycleType: (categoryId: string, year: number, noteId?: string) => BudgetCycleType | 'mixed' | null
  getMonthlyEquivalent: (categoryId: string, year: number, month: number, noteId?: string) => number
  getCategoryBudgetEntries: (categoryId: string, noteId?: string) => BudgetEntry[]
  getNoteBudgetEntries: (noteId: string) => BudgetEntry[]
}

function createStore(): BudgetsStore {
  const budgets = ref<BudgetEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let lastNoteId: string | undefined = undefined

  async function loadBudgets(noteId?: string) {
    lastNoteId = noteId
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId !== undefined ? { noteId: noteId || '' } : {}
      const result = await db.budgets.find({
        selector,
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

  // 单例 store 启动时自动订阅变更
  onCollectionChange('budgets', () => {
    loadBudgets(lastNoteId)
  })

  async function upsertBudget(data: BudgetFormData): Promise<BudgetEntry> {
    const db = await getDB()
    const existing = budgets.value.find(
      b =>
        b.noteId === (data.noteId || '') &&
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
      noteId: data.noteId || '',
      categoryId: data.categoryId,
      effectiveFromYear: data.effectiveFromYear,
      effectiveFromMonth: data.effectiveFromMonth,
      cycleType: data.cycleType,
      amount: data.amount,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.budgets.insert({ ...budget })
    budgets.value.push(budget)
    return budget
  }

  async function deleteBudget(id: string) {
    const db = await getDB()
    const doc = await db.budgets.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    budgets.value = budgets.value.filter(b => b.id !== id)
  }

  function resolveBudget(
    categoryId: string,
    year: number,
    month: number,
    noteId?: string
  ): { cycleType: BudgetCycleType; amount: number } | null {
    const entries = budgets.value
      .filter(b => b.categoryId === categoryId && (noteId === undefined || b.noteId === noteId))
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
    year: number,
    noteId?: string
  ): Array<{ month: number; cycleType: BudgetCycleType; amount: number } | null> {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const cfg = resolveBudget(categoryId, year, month, noteId)
      return cfg ? { month, ...cfg } : null
    })
  }

  function getYearCycleType(
    categoryId: string,
    year: number,
    noteId?: string
  ): BudgetCycleType | 'mixed' | null {
    const configs = resolveYear(categoryId, year, noteId)
    const hasMonthly = configs.some(c => c?.cycleType === 'monthly')
    const hasYearly = configs.some(c => c?.cycleType === 'yearly')

    if (hasMonthly && hasYearly) return 'mixed'
    if (hasMonthly) return 'monthly'
    if (hasYearly) return 'yearly'
    return null
  }

  function getMonthlyEquivalent(categoryId: string, year: number, month: number, noteId?: string): number {
    const config = resolveBudget(categoryId, year, month, noteId)
    if (!config) return 0
    if (config.cycleType === 'yearly') return div(config.amount, 12)
    return config.amount
  }

  function getCategoryBudgetEntries(categoryId: string, noteId?: string): BudgetEntry[] {
    return budgets.value
      .filter(b => b.categoryId === categoryId && (noteId === undefined || b.noteId === noteId))
      .sort((a, b) => {
        const aTime = a.effectiveFromYear * 12 + a.effectiveFromMonth
        const bTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
        return aTime - bTime
      })
  }

  function getNoteBudgetEntries(noteId: string): BudgetEntry[] {
    // 项目预算使用 note: 前缀存储在 categoryId 字段
    const noteCategoryId = `note:${noteId}`
    return budgets.value
      .filter(b => b.categoryId === noteCategoryId)
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
    getCategoryBudgetEntries,
    getNoteBudgetEntries
  }
}

let _store: BudgetsStore | null = null

export function useBudgets(): BudgetsStore {
  if (!_store) {
    _store = createStore()
  }
  return _store
}
