import { ref, computed } from 'vue'
import type { Bill, Account, BillCategory, BudgetEntry, Statement, ImportRule } from '~/types/bill'

export function useBillingDialogs() {
  // 可见性状态
  const billDialogVisible = ref(false)
  const accountDialogVisible = ref(false)
  const categoryDialogVisible = ref(false)
  const budgetDialogVisible = ref(false)
  const statementDialogVisible = ref(false)
  const statementListDialogVisible = ref(false)
  const importDialogVisible = ref(false)
  const ruleDialogVisible = ref(false)
  const balanceAdjustVisible = ref(false)
  const batchEditVisible = ref(false)
  const recordDetailVisible = ref(false)

  // 编辑状态
  const editingBill = ref<Bill | null>(null)
  const editingAccount = ref<Account | null>(null)
  const editingCategory = ref<BillCategory | null>(null)
  const editingBudget = ref<BudgetEntry | null>(null)
  const editingStatement = ref<Statement | null>(null)
  const editingRule = ref<ImportRule | null>(null)

  // 表单默认值
  const categoryFormDefaults = ref<{
    type?: 'income' | 'expense' | undefined
    defaultParentId?: string
    defaultName?: string
  } | null>(null)

  const accountFormDefaults = ref<{
    defaultName?: string
    defaultType?: 'personal' | 'contact' | 'merchant' | 'other'
  } | null>(null)

  const lastBillDefaults = ref<Partial<{
    type: 'income' | 'expense' | 'transfer' | 'debt'
    fromAccountId: string
    toAccountId: string
    categoryId: string
    currency: string
  }> | null>(null)

  // 视图状态
  const viewingAccount = ref<Account | null>(null)
  const viewingRecordId = ref<string | null>(null)
  const adjustingAccount = ref<Account | null>(null)
  const balanceAdjustments = ref<any[]>([])

  // 计算属性
  const recordDetailRecord = computed(() => {
    // 需要外部提供getById函数
    return viewingRecordId.value ? null : null
  })

  // 打开操作
  const openBillDialog = (bill?: Bill) => {
    editingBill.value = bill || null
    billDialogVisible.value = true
  }

  const openAccountDialog = (account?: Account, defaultType?: 'personal' | 'contact' | 'merchant' | 'other') => {
    editingAccount.value = account || null
    if (!account && defaultType) {
      accountFormDefaults.value = { defaultType }
    }
    accountDialogVisible.value = true
  }

  const openCategoryDialog = (
    category?: BillCategory,
    defaultType?: 'income' | 'expense'
  ) => {
    editingCategory.value = category || null
    categoryFormDefaults.value = defaultType ? { type: defaultType } : null
    categoryDialogVisible.value = true
  }

  const openBudgetDialog = (budget?: BudgetEntry) => {
    editingBudget.value = budget || null
    budgetDialogVisible.value = true
  }

  const openStatementList = (account: Account) => {
    viewingAccount.value = account
    statementListDialogVisible.value = true
  }

  const openBalanceAdjustDialog = (account: Account) => {
    adjustingAccount.value = account
    balanceAdjustVisible.value = true
  }

  const openStatementEdit = (stmt: Statement) => {
    editingStatement.value = stmt
    statementDialogVisible.value = true
  }

  const openRuleDialog = (rule?: ImportRule) => {
    editingRule.value = rule || null
    ruleDialogVisible.value = true
  }

  const openImportDialog = () => {
    importDialogVisible.value = true
  }

  // 关闭操作
  const closeBillDialog = () => {
    billDialogVisible.value = false
    editingBill.value = null
  }

  const closeAccountDialog = () => {
    accountDialogVisible.value = false
    editingAccount.value = null
    accountFormDefaults.value = null
  }

  const closeCategoryDialog = () => {
    categoryDialogVisible.value = false
    editingCategory.value = null
    categoryFormDefaults.value = null
  }

  const closeBudgetDialog = () => {
    budgetDialogVisible.value = false
    editingBudget.value = null
  }

  const closeStatementDialog = () => {
    statementDialogVisible.value = false
    editingStatement.value = null
  }

  const closeStatementList = () => {
    statementListDialogVisible.value = false
    viewingAccount.value = null
  }

  const closeImportDialog = () => {
    importDialogVisible.value = false
  }

  const closeRuleDialog = () => {
    ruleDialogVisible.value = false
    editingRule.value = null
  }

  const closeBalanceAdjust = () => {
    balanceAdjustVisible.value = false
    adjustingAccount.value = null
  }

  const closeBatchEdit = () => {
    batchEditVisible.value = false
  }

  const closeRecordDetail = () => {
    recordDetailVisible.value = false
    viewingRecordId.value = null
  }

  return {
    // 可见性状态
    billDialogVisible,
    accountDialogVisible,
    categoryDialogVisible,
    budgetDialogVisible,
    statementDialogVisible,
    statementListDialogVisible,
    importDialogVisible,
    ruleDialogVisible,
    balanceAdjustVisible,
    batchEditVisible,
    recordDetailVisible,

    // 编辑状态
    editingBill,
    editingAccount,
    editingCategory,
    editingBudget,
    editingStatement,
    editingRule,

    // 表单默认值
    categoryFormDefaults,
    accountFormDefaults,
    lastBillDefaults,

    // 视图状态
    viewingAccount,
    viewingRecordId,
    recordDetailRecord,
    adjustingAccount,
    balanceAdjustments,

    // 打开操作
    openBillDialog,
    openAccountDialog,
    openCategoryDialog,
    openBudgetDialog,
    openStatementList,
    openBalanceAdjustDialog,
    openStatementEdit,
    openRuleDialog,
    openImportDialog,

    // 关闭操作
    closeBillDialog,
    closeAccountDialog,
    closeCategoryDialog,
    closeBudgetDialog,
    closeStatementDialog,
    closeStatementList,
    closeImportDialog,
    closeRuleDialog,
    closeBalanceAdjust,
    closeBatchEdit,
    closeRecordDetail
  }
}
