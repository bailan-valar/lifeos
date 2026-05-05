import type { BillCategory, CategoryFormData, CategoryTreeNode } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let store: ReturnType<typeof createStore> | null = null

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
      categories.value = result.map((doc: any) => doc.toJSON())
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
      isSynced: false
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
    buildTree
  }
}

export function useBillCategories() {
  if (!store) {
    store = createStore()
  }
  return store
}
