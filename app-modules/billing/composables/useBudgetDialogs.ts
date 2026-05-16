import { ref } from 'vue'
import type { BudgetEntry } from '~/types/bill'

let _store: BudgetDialogsStore | null = null

interface BudgetDialogsStore {
  budgetDialogVisible: Ref<boolean>
  editingBudget: Ref<BudgetEntry | null>
  openBudgetDialog: (budget?: BudgetEntry) => void
  closeBudgetDialog: () => void
}

function createStore(): BudgetDialogsStore {
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

export function useBudgetDialogs(): BudgetDialogsStore {
  if (!_store) _store = createStore()
  return _store
}
