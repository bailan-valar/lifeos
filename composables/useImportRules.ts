import type { ImportRule, ImportRuleFormData, CsvParsedRow } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

export interface ApplyRulesResult {
  rule: ImportRule
  matchedField: 'counterparty' | 'paymentMethod'
}

let _store: ImportRulesStore | null = null

interface ImportRulesStore {
  rules: Ref<ImportRule[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadImportRules: () => Promise<void>
  createImportRule: (data: ImportRuleFormData) => Promise<ImportRule>
  updateImportRule: (id: string, data: Partial<ImportRuleFormData>) => Promise<void>
  deleteImportRule: (id: string) => Promise<void>
  applyRules: (row: CsvParsedRow, source: 'alipay' | 'wechat') => ApplyRulesResult | null
}

function createStore(): ImportRulesStore {
  const rules = ref<ImportRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadImportRules() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const result = await db.importRules.find({
        sort: [{ priority: 'desc' }]
      }).exec()
      rules.value = result.map((doc: any) => {
        const raw = doc.toJSON()
        // 迁移旧数据:fromAccountId/toAccountId → accountId
        if (!raw.accountId && (raw.fromAccountId || raw.toAccountId)) {
          raw.accountId = raw.toAccountId || raw.fromAccountId || ''
        }
        // 迁移旧数据:myAccountId → accountId
        if (!raw.accountId && raw.myAccountId) {
          raw.accountId = raw.myAccountId
        }
        delete raw.myAccountId
        return raw
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load import rules:', e)
    } finally {
      loading.value = false
    }
  }

  async function createImportRule(data: ImportRuleFormData): Promise<ImportRule> {
    const db = await getDB()
    const rule: ImportRule = {
      id: generateId(),
      name: data.name,
      source: data.source,
      matchMode: data.matchMode,
      pattern: data.pattern,
      categoryId: data.categoryId,
      accountId: data.accountId,
      billType: data.billType,
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
    const db = await getDB()
    const doc = await db.importRules.findOne(id).exec()
    if (!doc) return
    const patch: Partial<ImportRule> = { ...data, updatedAt: now() }
    // 清理旧字段
    if ('myAccountId' in patch) {
      delete (patch as any).myAccountId
    }
    await doc.patch(patch)
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      rules.value[idx] = { ...rules.value[idx], ...patch }
    }
    rules.value.sort((a, b) => b.priority - a.priority)
  }

  async function deleteImportRule(id: string) {
    const db = await getDB()
    const doc = await db.importRules.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    rules.value = rules.value.filter(r => r.id !== id)
  }

  function matchOne(rule: ImportRule, target: string): boolean {
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
   * 对单行 CSV 应用规则集,返回首个命中的规则及匹配字段(按 priority desc)。
   * 优先匹配 counterparty,再匹配 paymentMethod。
   */
  function applyRules(row: CsvParsedRow, source: 'alipay' | 'wechat'): ApplyRulesResult | null {
    const candidates = rules.value.filter(r => r.enabled && (r.source === 'all' || r.source === source))
    for (const rule of candidates) {
      if (matchOne(rule, row.counterparty || '')) {
        return { rule, matchedField: 'counterparty' }
      }
      if (matchOne(rule, row.paymentMethod || '')) {
        return { rule, matchedField: 'paymentMethod' }
      }
    }
    return null
  }

  return {
    rules,
    loading,
    error,
    loadImportRules,
    createImportRule,
    updateImportRule,
    deleteImportRule,
    applyRules
  }
}

export function useImportRules(): ImportRulesStore {
  if (!_store) {
    _store = createStore()
  }
  return _store
}
