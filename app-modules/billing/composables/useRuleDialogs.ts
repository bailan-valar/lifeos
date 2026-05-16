import { ref } from 'vue'
import type { ImportRule } from '~/types/bill'

let _store: RuleDialogsStore | null = null

interface RuleDialogsStore {
  ruleDialogVisible: Ref<boolean>
  editingRule: Ref<ImportRule | null>
  openRuleDialog: (rule?: ImportRule) => void
  closeRuleDialog: () => void
}

function createStore(): RuleDialogsStore {
  const ruleDialogVisible = ref(false)
  const editingRule = ref<ImportRule | null>(null)

  function openRuleDialog(rule?: ImportRule) {
    editingRule.value = rule || null
    ruleDialogVisible.value = true
  }

  function closeRuleDialog() {
    ruleDialogVisible.value = false
    editingRule.value = null
  }

  return {
    ruleDialogVisible,
    editingRule,
    openRuleDialog,
    closeRuleDialog
  }
}

export function useRuleDialogs(): RuleDialogsStore {
  if (!_store) _store = createStore()
  return _store
}
