import { ref } from 'vue'
import type { Account, Statement } from '~/types/bill'

export function useAccountDialogs() {
  const accountDialogVisible = ref(false)
  const editingAccount = ref<Account | null>(null)
  const accountFormDefaults = ref<{
    defaultName?: string
    defaultType?: 'personal' | 'contact' | 'merchant' | 'other'
  } | null>(null)

  const balanceAdjustVisible = ref(false)
  const adjustingAccount = ref<Account | null>(null)
  const balanceAdjustments = ref<any[]>([])

  const statementDialogVisible = ref(false)
  const editingStatement = ref<Statement | null>(null)

  const statementListDialogVisible = ref(false)
  const viewingAccount = ref<Account | null>(null)

  function openAccountDialog(account?: Account, defaultType?: 'personal' | 'contact' | 'merchant' | 'other') {
    editingAccount.value = account || null
    if (!account && defaultType) {
      accountFormDefaults.value = { defaultType }
    }
    accountDialogVisible.value = true
  }

  function closeAccountDialog() {
    accountDialogVisible.value = false
    editingAccount.value = null
    accountFormDefaults.value = null
  }

  function openBalanceAdjustDialog(account: Account) {
    adjustingAccount.value = account
    balanceAdjustVisible.value = true
  }

  function closeBalanceAdjust() {
    balanceAdjustVisible.value = false
    adjustingAccount.value = null
  }

  function openStatementList(account: Account) {
    viewingAccount.value = account
    statementListDialogVisible.value = true
  }

  function closeStatementList() {
    statementListDialogVisible.value = false
    viewingAccount.value = null
  }

  function openStatementEdit(stmt: Statement) {
    editingStatement.value = stmt
    statementDialogVisible.value = true
  }

  function closeStatementDialog() {
    statementDialogVisible.value = false
    editingStatement.value = null
  }

  return {
    accountDialogVisible,
    editingAccount,
    accountFormDefaults,
    balanceAdjustVisible,
    adjustingAccount,
    balanceAdjustments,
    statementDialogVisible,
    editingStatement,
    statementListDialogVisible,
    viewingAccount,
    openAccountDialog,
    closeAccountDialog,
    openBalanceAdjustDialog,
    closeBalanceAdjust,
    openStatementList,
    closeStatementList,
    openStatementEdit,
    closeStatementDialog
  }
}
