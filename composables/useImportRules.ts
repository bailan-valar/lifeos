import type { ImportRule, ImportRuleFormData, CsvParsedRow, ImportSource, ImportRuleMatchField, ImportRuleMatchMode, BillType, BillCategory, Account } from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'

export interface ApplyRulesResult {
  counterpartyRule?: ImportRule
  paymentMethodRule?: ImportRule
  descriptionRule?: ImportRule
  rawTypeRule?: ImportRule
}

export interface ExportedImportRule {
  source: ImportSource | 'all'
  matchField?: ImportRuleMatchField
  matchDirection?: 'in' | 'out'
  matchMode: ImportRuleMatchMode
  pattern: string
  categoryId: string
  categoryName?: string
  accountId: string
  accountName?: string
  billType?: BillType
  priority: number
  enabled: boolean
}

let _store: ImportRulesStore | null = null
let _unsub: (() => void) | null = null

function startWatchingImportRules() {
  if (_unsub) return
  _unsub = onCollectionChange('importRules', () => {
    if (_store) _store.loadImportRules()
  })
}

function stopWatchingImportRules() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingImportRules()
    startWatchingImportRules()
    if (_store) _store.loadImportRules()
  })
}

interface ImportRulesStore {
  rules: Ref<ImportRule[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadImportRules: () => Promise<void>
  createImportRule: (data: ImportRuleFormData) => Promise<ImportRule>
  updateImportRule: (id: string, data: Partial<ImportRuleFormData>) => Promise<void>
  deleteImportRule: (id: string) => Promise<void>
  deleteImportRules: (ids: string[]) => Promise<{ deleted: number; failed: number }>
  updateImportRules: (ids: string[], data: Partial<ImportRuleFormData>) => Promise<{ updated: number; failed: number }>
  applyRules: (row: CsvParsedRow, source: ImportSource) => ApplyRulesResult | null
  exportRules: () => Promise<ExportedImportRule[]>
  importRules: (items: any[]) => Promise<{ created: number; skipped: number }>
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
      source: data.source,
      matchField: data.matchField,
      matchDirection: data.matchDirection,
      matchMode: data.matchMode,
      pattern: data.pattern,
      categoryId: data.categoryId,
      accountId: data.accountId,
      billType: data.billType,
      priority: data.priority,
      enabled: data.enabled,
      createdAt: now(),
      updatedAt: now(),
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

  async function deleteImportRules(ids: string[]): Promise<{ deleted: number; failed: number }> {
    const db = await getDB()
    let deleted = 0
    let failed = 0
    for (const id of ids) {
      try {
        const doc = await db.importRules.findOne(id).exec()
        if (doc) {
          await doc.remove()
          deleted++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    rules.value = rules.value.filter(r => !ids.includes(r.id))
    return { deleted, failed }
  }

  async function updateImportRules(ids: string[], data: Partial<ImportRuleFormData>): Promise<{ updated: number; failed: number }> {
    const db = await getDB()
    let updated = 0
    let failed = 0
    const patch: Partial<ImportRule> = { ...data, updatedAt: now() }
    if ('myAccountId' in patch) {
      delete (patch as any).myAccountId
    }
    for (const id of ids) {
      try {
        const doc = await db.importRules.findOne(id).exec()
        if (doc) {
          await doc.patch(patch)
          updated++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    for (const rule of rules.value) {
      if (ids.includes(rule.id)) {
        Object.assign(rule, patch)
      }
    }
    rules.value.sort((a, b) => b.priority - a.priority)
    return { updated, failed }
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
   * 对单行 CSV 应用规则集,分别独立匹配 counterparty / paymentMethod / description。
   * 三者可命中不同规则,各自填充对应账户/分类,实现"分别匹配为出账账户与入账账户及分类"。
   */
  function applyRules(row: CsvParsedRow, source: ImportSource): ApplyRulesResult | null {
    const candidates = rules.value.filter(r =>
      r.enabled &&
      (r.source === 'all' || r.source === source) &&
      (!r.matchDirection || r.matchDirection === row.direction)
    )
    let counterpartyRule: ImportRule | undefined
    let paymentMethodRule: ImportRule | undefined
    let descriptionRule: ImportRule | undefined
    let rawTypeRule: ImportRule | undefined

    for (const rule of candidates) {
      const field = rule.matchField ?? 'account'
      const matchAccount = field === 'account'
      const matchDescription = field === 'description'
      const matchRawType = field === 'rawType'

      if (matchAccount) {
        if (!counterpartyRule && matchOne(rule, row.counterparty || '')) {
          counterpartyRule = rule
        }
        if (!paymentMethodRule && matchOne(rule, row.paymentMethod || '')) {
          paymentMethodRule = rule
        }
      }
      if (!descriptionRule && matchDescription && matchOne(rule, row.description || '')) {
        descriptionRule = rule
      }
      if (!rawTypeRule && matchRawType && matchOne(rule, row.rawType || '')) {
        rawTypeRule = rule
      }
      if (counterpartyRule && paymentMethodRule && descriptionRule && rawTypeRule) break
    }

    if (!counterpartyRule && !paymentMethodRule && !descriptionRule && !rawTypeRule) return null
    return { counterpartyRule, paymentMethodRule, descriptionRule, rawTypeRule }
  }

  async function exportRules(): Promise<ExportedImportRule[]> {
    const db = await getDB()
    const [catDocs, accDocs] = await Promise.all([
      db.billCategories.find({}).exec(),
      db.accounts.find({}).exec(),
    ])
    const catMap = new Map<string, string>(catDocs.map((d: any) => [d.toJSON().id as string, d.toJSON().name as string]))
    const accMap = new Map<string, string>(accDocs.map((d: any) => [d.toJSON().id as string, d.toJSON().name as string]))

    return rules.value.map(r => ({
      source: r.source,
      matchField: r.matchField,
      matchDirection: r.matchDirection,
      matchMode: r.matchMode,
      pattern: r.pattern,
      categoryId: r.categoryId,
      categoryName: catMap.get(r.categoryId) || '',
      accountId: r.accountId,
      accountName: accMap.get(r.accountId) || '',
      billType: r.billType,
      priority: r.priority,
      enabled: r.enabled,
    }))
  }

  async function importRules(items: any[]): Promise<{ created: number; skipped: number }> {
    const db = await getDB()
    const [catDocs, accDocs] = await Promise.all([
      db.billCategories.find({}).exec(),
      db.accounts.find({}).exec(),
    ])
    const cats = catDocs.map((d: any) => d.toJSON() as BillCategory)
    const accs = accDocs.map((d: any) => d.toJSON() as Account)

    const categoryIdMap = new Map<string, string>(cats.map(c => [c.id, c.name]))
    const categoryNameMap = new Map<string, string>()
    for (const c of cats) {
      if (!categoryNameMap.has(c.name)) {
        categoryNameMap.set(c.name, c.id)
      }
    }

    const accountIdMap = new Map<string, string>(accs.map(a => [a.id, a.name]))
    const accountNameMap = new Map<string, string>()
    for (const a of accs) {
      if (!accountNameMap.has(a.name)) {
        accountNameMap.set(a.name, a.id)
      }
    }

    let created = 0
    let skipped = 0
    const existingKeys = new Set(
      rules.value.map(r => `${r.pattern}|${r.matchMode}|${r.source}|${r.matchField || 'account'}`)
    )
    for (const item of items) {
      const key = `${item.pattern}|${item.matchMode}|${item.source}|${item.matchField || 'account'}|${item.matchDirection || ''}`
      if (existingKeys.has(key)) {
        skipped++
        continue
      }

      let categoryId = item.categoryId || ''
      if (categoryId && !categoryIdMap.has(categoryId)) {
        const categoryName = item.categoryName || ''
        if (categoryName && categoryNameMap.has(categoryName)) {
          categoryId = categoryNameMap.get(categoryName)!
        } else {
          skipped++
          continue
        }
      }

      let accountId = item.accountId || ''
      if (accountId && !accountIdMap.has(accountId)) {
        const accountName = item.accountName || ''
        if (accountName && accountNameMap.has(accountName)) {
          accountId = accountNameMap.get(accountName)!
        } else {
          skipped++
          continue
        }
      }

      existingKeys.add(key)
      const rule: ImportRule = {
        id: generateId(),
        source: item.source,
        matchField: item.matchField,
        matchDirection: item.matchDirection,
        matchMode: item.matchMode,
        pattern: item.pattern,
        categoryId,
        accountId,
        billType: item.billType,
        priority: item.priority,
        enabled: item.enabled,
        createdAt: now(),
        updatedAt: now(),
      }
      await db.importRules.insert({ ...rule })
      rules.value.push(rule)
      created++
    }
    rules.value.sort((a, b) => b.priority - a.priority)
    return { created, skipped }
  }

  return {
    rules,
    loading,
    error,
    loadImportRules,
    createImportRule,
    updateImportRule,
    deleteImportRule,
    deleteImportRules,
    updateImportRules,
    applyRules,
    exportRules,
    importRules
  }
}

export function useImportRules(): ImportRulesStore {
  if (!_store) {
    _store = createStore()
    // 首次创建时自动加载，组件无需手动调 loadImportRules()
    _store.loadImportRules()
  }
  startWatchingImportRules()
  return _store
}
