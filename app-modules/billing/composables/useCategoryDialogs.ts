import { ref } from 'vue'
import type { BillCategory } from '~/types/bill'

export function useCategoryDialogs() {
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
