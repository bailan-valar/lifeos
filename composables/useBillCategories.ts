import type { BillCategory, CategoryFormData, CategoryTreeNode, CategoryType } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

export interface ExportedCategory {
  name: string
  type: CategoryType
  icon?: string
  color?: string
  children?: ExportedCategory[]
}

export interface ImportCategoriesResult {
  created: number
  skipped: number
}

export interface SyncDefaultCategoriesResult {
  created: number
  skipped: number
}

const INVALID_ICON_MAP: Record<string, string> = {
  'solar:apple-linear': 'solar:plate-linear',
  'solar:glass-water-linear': 'solar:cup-linear',
  'solar:taxi-linear': 'solar:traffic-linear',
  'solar:airplane-linear': 'solar:rocket-linear',
  'solar:hammer-linear': 'solar:settings-linear',
  'solar:money-linear': 'solar:money-bag-linear',
  'solar:flower-linear': 'solar:leaf-linear',
  'solar:wrench-linear': 'solar:settings-minimalistic-linear',
  'solar:receipt-linear': 'solar:bill-linear',
}

function createStore() {
  const categories = ref<BillCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadCategories() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const result = await db.billCategories.find({
        sort: [{ order: 'asc' }]
      }).exec()
      const list = result.map((doc: any) => doc.toJSON()) as BillCategory[]
      const needsFix = list.filter(c => c.icon && INVALID_ICON_MAP[c.icon])
      if (needsFix.length > 0) {
        for (const c of needsFix) {
          c.icon = INVALID_ICON_MAP[c.icon]
          try {
            const doc = await db.billCategories.findOne(c.id).exec()
            if (doc) await doc.patch({ icon: c.icon, updatedAt: now() })
          } catch (e) {
            console.warn('Failed to fix invalid category icon:', c.id, e)
          }
        }
      }
      categories.value = list
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bill categories:', e)
    } finally {
      loading.value = false
    }
  }

  async function createCategory(data: CategoryFormData): Promise<BillCategory> {
    const db = await getDB()
    const siblings = categories.value.filter(c => c.parentId === data.parentId && c.type === data.type)
    const category: BillCategory = {
      id: generateId(),
      name: data.name,
      parentId: data.parentId,
      type: data.type,
      icon: data.icon || '',
      color: data.color || '',
      order: siblings.length,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.billCategories.insert({ ...category })
    categories.value.push(category)
    return category
  }

  async function updateCategory(id: string, data: Partial<CategoryFormData>) {
    const db = await getDB()
    const doc = await db.billCategories.findOne(id).exec()
    if (!doc) return
    await doc.patch({ ...data, updatedAt: now() })
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      categories.value[idx] = { ...categories.value[idx], ...data, updatedAt: now() }
    }
  }

  async function deleteCategory(id: string) {
    const db = await getDB()
    const children = categories.value.filter(c => c.parentId === id)
    if (children.length > 0) {
      throw new Error('该分类下存在子分类，无法删除')
    }
    const doc = await db.billCategories.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    categories.value = categories.value.filter(c => c.id !== id)
  }

  async function ensureDefaultCategories(): Promise<boolean> {
    if (categories.value.length > 0) return false
    const defaults = await import('~/app-modules/billing/data/default-categories.json')
      .then(m => m.default)
      .catch(() => null)
    if (!defaults || !Array.isArray(defaults)) return false

    const db = await getDB()
    const ts = now()
    const toInsert: BillCategory[] = []

    function walk(items: any[], parentId: string, type: CategoryType) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const id = generateId()
        const cat: BillCategory = {
          id,
          name: item.name,
          type: item.type || type,
          parentId,
          icon: item.icon || '',
          color: item.color || '',
          order: i,
          createdAt: ts,
          updatedAt: ts,
        }
        toInsert.push(cat)
        if (item.children?.length) {
          walk(item.children, id, cat.type)
        }
      }
    }

    walk(defaults, '', 'expense')
    for (const cat of toInsert) {
      await db.billCategories.insert({ ...cat })
    }
    categories.value = toInsert
    return true
  }

  function exportCategories(): ExportedCategory[] {
    const income = buildTree('income')
    const expense = buildTree('expense')

    function walk(nodes: CategoryTreeNode[]): ExportedCategory[] {
      return nodes.map(n => ({
        name: n.name,
        type: n.type,
        icon: n.icon || undefined,
        color: n.color || undefined,
        children: n.children.length > 0 ? walk(n.children) : undefined,
      }))
    }

    return [...walk(expense), ...walk(income)]
  }

  async function importCategories(
    items: ExportedCategory[],
    options?: { overwrite?: boolean }
  ): Promise<ImportCategoriesResult> {
    const db = await getDB()
    let created = 0
    let skipped = 0

    // 建立现有分类的去重键: name|type|parentName
    const existingMap = new Map<string, string>() // key -> id
    const nameMap = new Map<string, string>() // id -> name
    for (const c of categories.value) {
      nameMap.set(c.id, c.name)
    }
    for (const c of categories.value) {
      const parentName = c.parentId ? (nameMap.get(c.parentId) || '') : ''
      existingMap.set(`${c.name}|${c.type}|${parentName}`, c.id)
    }

    const ts = now()
    const toInsert: BillCategory[] = []
    const idMapping = new Map<string, string>() // tempId -> newId

    function processList(list: ExportedCategory[], parentId: string, parentName: string) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        const dupKey = `${item.name}|${item.type}|${parentName}`
        if (existingMap.has(dupKey) && !options?.overwrite) {
          skipped++
          // 记录已有 ID 用于子分类的 parentId 映射
          const existingId = existingMap.get(dupKey)!
          idMapping.set(`${item.name}|${item.type}|${parentId}`, existingId)
          if (item.children?.length) {
            processList(item.children, existingId, item.name)
          }
          continue
        }

        const newId = generateId()
        idMapping.set(`${item.name}|${item.type}|${parentId}`, newId)

        const cat: BillCategory = {
          id: newId,
          name: item.name,
          type: item.type,
          parentId,
          icon: item.icon || '',
          color: item.color || '',
          order: i,
          createdAt: ts,
          updatedAt: ts,
        }
        toInsert.push(cat)
        created++

        if (item.children?.length) {
          processList(item.children, newId, item.name)
        }
      }
    }

    processList(items, '', '')

    for (const cat of toInsert) {
      await db.billCategories.insert({ ...cat })
    }
    categories.value.push(...toInsert)

    return { created, skipped }
  }

  async function syncDefaultCategories(): Promise<SyncDefaultCategoriesResult> {
    const defaults = await import('~/app-modules/billing/data/default-categories.json')
      .then(m => m.default)
      .catch(() => null)
    if (!defaults || !Array.isArray(defaults)) return { created: 0, skipped: 0 }

    // 建立现有分类的去重键
    const existingMap = new Map<string, string>() // key -> id
    const nameMap = new Map<string, string>() // id -> name
    for (const c of categories.value) {
      nameMap.set(c.id, c.name)
    }
    for (const c of categories.value) {
      const parentName = c.parentId ? (nameMap.get(c.parentId) || '') : ''
      existingMap.set(`${c.name}|${c.type}|${parentName}`, c.id)
    }

    const db = await getDB()
    const ts = now()
    const toInsert: BillCategory[] = []
    const idMapping = new Map<string, string>() // tempId -> newId or existingId
    let skipped = 0

    function processList(list: any[], parentId: string, parentName: string, type: CategoryType) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        const itemType = item.type || type
        const dupKey = `${item.name}|${itemType}|${parentName}`
        if (existingMap.has(dupKey)) {
          skipped++
          const existingId = existingMap.get(dupKey)!
          idMapping.set(`${item.name}|${itemType}|${parentId}`, existingId)
          if (item.children?.length) {
            processList(item.children, existingId, item.name, itemType)
          }
          continue
        }

        const newId = generateId()
        idMapping.set(`${item.name}|${itemType}|${parentId}`, newId)

        const cat: BillCategory = {
          id: newId,
          name: item.name,
          type: itemType,
          parentId,
          icon: item.icon || '',
          color: item.color || '',
          order: i,
          createdAt: ts,
          updatedAt: ts,
        }
        toInsert.push(cat)

        if (item.children?.length) {
          processList(item.children, newId, item.name, itemType)
        }
      }
    }

    processList(defaults, '', '', 'expense')

    for (const cat of toInsert) {
      await db.billCategories.insert({ ...cat })
    }
    categories.value.push(...toInsert)

    return { created: toInsert.length, skipped }
  }

  async function resetCategories(): Promise<boolean> {
    const db = await getDB()

    // 1. 收集所有旧分类 ID（循环查询确保获取全部）
    const oldDocs = await db.billCategories.find({}).exec()
    const oldIds = new Set<string>(oldDocs.map((d: any) => d.toJSON().id))

    // 2. 循环删除所有旧分类（先删子分类，再删父分类）
    let docsToDelete = await db.billCategories.find({}).exec()
    while (docsToDelete.length > 0) {
      const docsMap = new Map<string, BillCategory>()
      for (const doc of docsToDelete) {
        const json = doc.toJSON() as BillCategory
        docsMap.set(json.id, json)
      }
      function getDepth(id: string): number {
        const doc = docsMap.get(id)
        if (!doc || !doc.parentId) return 0
        return 1 + getDepth(doc.parentId)
      }
      const sorted = [...docsToDelete].sort((a: any, b: any) => {
        const depthA = getDepth(a.toJSON().id)
        const depthB = getDepth(b.toJSON().id)
        return depthB - depthA
      })
      for (const doc of sorted) {
        await doc.remove()
      }
      docsToDelete = await db.billCategories.find({}).exec()
    }

    // 3. 清空关联账单的 categoryId
    const allBills = await db.bills.find({}).exec()
    for (const doc of allBills) {
      const json = doc.toJSON() as any
      if (oldIds.has(json.categoryId)) {
        await doc.patch({ categoryId: '', updatedAt: now() })
      }
    }

    // 4. 清空关联账户的 categoryId
    const allAccounts = await db.accounts.find({}).exec()
    for (const doc of allAccounts) {
      const json = doc.toJSON() as any
      if (oldIds.has(json.categoryId)) {
        await doc.patch({ categoryId: undefined, updatedAt: now() })
      }
    }

    // 5. 清空关联导入规则的 categoryId
    const allRules = await db.importRules.find({}).exec()
    for (const doc of allRules) {
      const json = doc.toJSON() as any
      if (oldIds.has(json.categoryId)) {
        await doc.patch({ categoryId: '', updatedAt: now() })
      }
    }

    // 6. 删除关联预算
    const allBudgets = await db.budgets.find({}).exec()
    for (const doc of allBudgets) {
      const json = doc.toJSON() as any
      if (oldIds.has(json.categoryId)) {
        await doc.remove()
      }
    }

    // 7. 清空本地状态并重新初始化
    categories.value = []
    return ensureDefaultCategories()
  }

  function buildTree(type: 'income' | 'expense'): CategoryTreeNode[] {
    const list = categories.value.filter(c => c.type === type)
    const map = new Map<string, CategoryTreeNode>()

    for (const cat of list) {
      map.set(cat.id, { ...cat, children: [], level: 0 })
    }

    const roots: CategoryTreeNode[] = []
    for (const node of map.values()) {
      if (!node.parentId) {
        node.level = 0
        roots.push(node)
      } else {
        const parent = map.get(node.parentId)
        if (parent) {
          node.level = parent.level + 1
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      }
    }
    return roots
  }

  const incomeCategories = computed(() =>
    categories.value.filter(c => c.type === 'income')
  )

  const expenseCategories = computed(() =>
    categories.value.filter(c => c.type === 'expense')
  )

  return {
    categories,
    incomeCategories,
    expenseCategories,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    buildTree,
    ensureDefaultCategories,
    resetCategories,
    syncDefaultCategories,
    exportCategories,
    importCategories
  }
}

export function useBillCategories() {
  return createStore()
}
