import { ref } from 'vue'
import type { BillCategory } from '~/types/bill'

let _store: CategoryDialogsStore | null = null

interface CategoryDialogsStore {
  categoryDialogVisible: Ref<boolean>
  editingCategory: Ref<BillCategory | null>
  categoryFormDefaults: Ref<{
    type?: 'income' | 'expense' | undefined
    defaultParentId?: string
    defaultName?: string
  } | null>
  openCategoryDialog: (category?: BillCategory, defaultType?: 'income' | 'expense') => void
  closeCategoryDialog: () => void
}

function createStore(): CategoryDialogsStore {
  const categoryDialogVisible = ref(false)
  const editingCategory = ref<BillCategory | null>(null)
  const categoryFormDefaults = ref<{
    type?: 'income' | 'expense' | undefined
    defaultParentId?: string
    defaultName?: string
  } | null>(null)

  function openCategoryDialog(category?: BillCategory, defaultType?: 'income' | 'expense') {
    editingCategory.value = category || null
    categoryFormDefaults.value = defaultType ? { type: defaultType } : null
    categoryDialogVisible.value = true
  }

  function closeCategoryDialog() {
    categoryDialogVisible.value = false
    editingCategory.value = null
    categoryFormDefaults.value = null
  }

  return {
    categoryDialogVisible,
    editingCategory,
    categoryFormDefaults,
    openCategoryDialog,
    closeCategoryDialog
  }
}

export function useCategoryDialogs(): CategoryDialogsStore {
  if (!_store) _store = createStore()
  return _store
}
