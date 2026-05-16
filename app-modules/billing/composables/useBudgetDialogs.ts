import { ref } from 'vue'
import type { BudgetEntry } from '~/types/bill'

export function useBudgetDialogs() {
  const budgetDialogVisible = ref(false)
  const editingBudget = ref<BudgetEntry | null>(null)

  function openBudgetDialog(budget?: BudgetEntry) {
    editingBudget.value = budget || null
    budgetDialogVisible.value = true
  }

  function closeBudgetDialog() {
    budgetDialogVisible.value = false
    editingBudget.value = null
  }

  return {
    budgetDialogVisible,
    editingBudget,
    openBudgetDialog,
    closeBudgetDialog
  }
}
