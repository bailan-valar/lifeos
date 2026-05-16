import { ref } from 'vue'
import type { ImportRule } from '~/types/bill'

export function useRuleDialogs() {
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
