import type { ImportRule, ImportRuleFormData, CsvParsedRow } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

export interface ApplyRulesResult {
  counterpartyRule?: ImportRule
  paymentMethodRule?: ImportRule
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
   * 对单行 CSV 应用规则集,分别独立匹配 counterparty 与 paymentMethod。
   * 两者可命中不同规则,各自填充对应账户,实现"分别匹配为出账账户与入账账户"。
   */
  function applyRules(row: CsvParsedRow, source: 'alipay' | 'wechat'): ApplyRulesResult | null {
    const candidates = rules.value.filter(r => r.enabled && (r.source === 'all' || r.source === source))
    let counterpartyRule: ImportRule | undefined
    let paymentMethodRule: ImportRule | undefined

    for (const rule of candidates) {
      if (!counterpartyRule && matchOne(rule, row.counterparty || '')) {
        counterpartyRule = rule
      }
      if (!paymentMethodRule && matchOne(rule, row.paymentMethod || '')) {
        paymentMethodRule = rule
      }
      if (counterpartyRule && paymentMethodRule) break
    }

    if (!counterpartyRule && !paymentMethodRule) return null
    return { counterpartyRule, paymentMethodRule }
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
