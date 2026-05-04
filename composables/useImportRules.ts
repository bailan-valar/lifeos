import type { ImportRule, ImportRuleFormData, CsvParsedRow, BillType } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

interface ImportRulesStore {
  rules: Ref<ImportRule[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadImportRules: () => Promise<void>
  createImportRule: (data: ImportRuleFormData) => Promise<ImportRule>
  updateImportRule: (id: string, data: Partial<ImportRuleFormData>) => Promise<void>
  deleteImportRule: (id: string) => Promise<void>
  applyRules: (row: CsvParsedRow, source: 'alipay' | 'wechat') => ImportRule | null
  inferBillType: (direction: 'in' | 'out') => BillType
}

let store: ImportRulesStore | null = null

function createStore(): ImportRulesStore {
  const rules = ref<ImportRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadImportRules() {
    loading.value = true
    error.value = null
    try {
      const db = await getDb()
      const result = await db.importRules.find({
        sort: [{ priority: 'desc' }]
      }).exec()
      rules.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load import rules:', e)
    } finally {
      loading.value = false
    }
  }

  async function createImportRule(data: ImportRuleFormData): Promise<ImportRule> {
    const db = await getDb()
    const rule: ImportRule = {
      id: generateId(),
      name: data.name,
      source: data.source,
      matchMode: data.matchMode,
      pattern: data.pattern,
      categoryId: data.categoryId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      priority: data.priority,
      enabled: data.enabled,
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.importRules.insert({ ...rule })
    rules.value.push(rule)
    rules.value.sort((a, b) => b.priority - a.priority)
    return rule
  }

  async function updateImportRule(id: string, data: Partial<ImportRuleFormData>) {
    const db = await getDb()
    const doc = await db.importRules.findOne(id).exec()
    if (!doc) return
    const patch = { ...data, updatedAt: now() }
    await doc.patch(patch)
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      rules.value[idx] = { ...rules.value[idx], ...patch }
    }
    rules.value.sort((a, b) => b.priority - a.priority)
  }

  async function deleteImportRule(id: string) {
    const db = await getDb()
    const doc = await db.importRules.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    rules.value = rules.value.filter(r => r.id !== id)
  }

  function matchOne(rule: ImportRule, row: CsvParsedRow): boolean {
    const target = row.counterparty || ''
    if (!target) return false
    switch (rule.matchMode) {
      case 'exact':
        return target === rule.pattern
      case 'fuzzy':
        return target.toLowerCase().includes(rule.pattern.toLowerCase())
      case 'regex':
        try {
          return new RegExp(rule.pattern, 'i').test(target)
        } catch {
          return false
        }
      default:
        return false
    }
  }

  /**
   * 对单行 CSV 应用规则集,返回首个命中的规则(按 priority desc)。
   */
  function applyRules(row: CsvParsedRow, source: 'alipay' | 'wechat'): ImportRule | null {
    const candidates = rules.value.filter(r => r.enabled && (r.source === 'all' || r.source === source))
    for (const rule of candidates) {
      if (matchOne(rule, row)) return rule
    }
    return null
  }

  /**
   * 推断 BillType:按金额方向。后续可扩展为按规则配置。
   */
  function inferBillType(direction: 'in' | 'out'): BillType {
    return direction === 'in' ? 'income' : 'expense'
  }

  return {
    rules,
    loading,
    error,
    loadImportRules,
    createImportRule,
    updateImportRule,
    deleteImportRule,
    applyRules,
    inferBillType
  }
}

export function useImportRules(): ImportRulesStore {
  if (!store) {
    store = createStore()
  }
  return store
}
