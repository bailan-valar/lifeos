<template>
  <div class="billing-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <BillingSidebar
      v-if="!isMobile"
      :active-tab="navigation.activeTab.value"
      :active-account-sub-tab="navigation.activeAccountSubTab.value"
      :active-category-sub-tab="navigation.activeCategorySubTab.value"
      :sidebar-collapsed="navigation.sidebarCollapsed.value"
      :accounts-menu-expanded="navigation.accountsMenuExpanded.value"
      :category-menu-expanded="navigation.categoryMenuExpanded.value"
      @toggle-sidebar="navigation.toggleSidebar"
      @accounts-tab-click="navigation.onAccountsTabClick"
      @categories-tab-click="navigation.onCategoriesTabClick"
      @account-sub-tab-change="handleAccountSubTabChange"
      @category-sub-tab-change="handleCategorySubTabChange"
      @tab-change="handleTabChange"
    />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 账单Tab -->
      <BillsTabPanel
        v-if="navigation.activeTab.value === 'bills'"
        :bills="bills"
        :accounts="accounts"
        :categories="categories"
        :view-mode="navigation.viewMode.value"
        :batch-mode="batchMode"
        :selected-ids="selectedIds"
        :loading="loading"
        :has-more="hasMore"
        :bill-year-filter="billYearFilter"
        :bill-month-filter="billMonthFilter"
        :bill-year-options="filters.billYearOptions.value"
        :bill-month-options="filters.billMonthOptions"
        :total-income="totalIncome"
        :total-expense="totalExpense"
        :net-balance="netBalance"
        :budget-progress="budgetProgress"
        :is-date-filtered="isDateFiltered"
        :selected-bills="selectedBills"
        @view-mode-change="handleViewModeChange"
        @year-change="handleYearChange"
        @month-change="handleMonthChange"
        @toggle-select-all="handleToggleSelectAll"
        @batch-delete="handleBatchDelete"
        @batch-edit="batchEditVisible = true"
        @exit-batch-mode="exitBatchMode"
        @edit-bill="dialogs.openBillDialog"
        @delete-bill="handleDeleteBill"
        @select-bill="toggleBillSelect"
        @select-all-bills="selectAllBills"
        @unselect-all-bills="unselectAllBills"
        @calendar-date-change="(data) => onCalendarDateChange(data.year, data.month)"
        @load-more="handleLoadMore"
      />

      <!-- 账户Tab -->
      <AccountsTabPanel
        v-if="navigation.activeTab.value === 'accounts'"
        :accounts="filteredAccounts"
        :active-account-sub-tab="navigation.activeAccountSubTab.value"
        :account-sub-tab-title="navigation.accountSubTabTitle.value"
        :account-sub-tab-options="accountSubTabOptions"
        :is-mobile="isMobile"
        @account-sub-tab-change="navigation.activeAccountSubTab.value = $event"
        @add-account="dialogs.openAccountDialog"
        @edit-account="dialogs.openAccountDialog"
        @delete-account="handleDeleteAccount"
        @view-statements="dialogs.openStatementList"
        @adjust-balance="dialogs.openBalanceAdjustDialog"
        @view-account-detail="navigateToAccountDetail"
      />

      <!-- 分类Tab -->
      <CategoriesTabPanel
        v-if="navigation.activeTab.value === 'categories'"
        :income-tree="incomeTree"
        :expense-tree="expenseTree"
        :active-category-sub-tab="navigation.activeCategorySubTab.value"
        :category-sub-tab-title="navigation.categorySubTabTitle.value"
        :category-sub-tab-options="categorySubTabOptions"
        :is-mobile="isMobile"
        @category-sub-tab-change="handleCategorySubTabChange"
        @export-categories="handleExportCategories"
        @import-categories="handleImportCategories"
        @sync-default-categories="handleSyncDefaultCategories"
        @add-category="dialogs.openCategoryDialog"
        @edit-category="dialogs.openCategoryDialog"
        @delete-category="handleDeleteCategory"
        @add-child-category="openAddChildCategoryDialog"
        @view-category-detail="navigateToCategoryDetail"
        @category-contextmenu="openCategoryContextMenu"
      />

      <!-- 预算Tab -->
      <BudgetsTabPanel
        v-if="navigation.activeTab.value === 'budgets'"
        :budget-year="budgetYear"
        @edit-budget-cell="(data) => onBudgetCellEdit(data.categoryId, data.year, data.month, data.noteId)"
        @category-contextmenu="openCategoryContextMenu"
      />

      <!-- 规则Tab -->
      <RulesTabPanel
        v-if="navigation.activeTab.value === 'rules'"
        :import-rules="importRules"
        :accounts="accounts"
        :categories="categories"
        :is-mobile="isMobile"
        @back="navigation.activeTab.value = 'bills'"
        @add-rule="dialogs.openRuleDialog"
        @edit-rule="dialogs.openRuleDialog"
        @delete-rule="handleDeleteRule"
        @toggle-rule="handleToggleRule"
        @export-rules="handleExportRules"
        @import-rules="handleImportRules"
        @batch-delete-rules="handleBatchDeleteRules"
        @batch-enable-rules="handleBatchEnableRules"
        @batch-disable-rules="handleBatchDisableRules"
      />
    </div>

    <!-- 移动端Tab栏 -->
    <BillingMobileTabbar
      v-if="isMobile"
      :active-tab="navigation.activeTab.value"
      @tab-change="handleTabChange"
    />

    <!-- 分类上下文菜单 -->
    <CategoryContextMenu
      :visible="categoryMenu.visible"
      :x="categoryMenu.x"
      :y="categoryMenu.y"
      :node="categoryMenu.node"
      @add-child="onMenuAddChild"
      @edit="onMenuEdit"
      @delete="onMenuDelete"
    />

    <!-- 对话框层 -->
    <BillingDialogsLayer
      :note-id="noteId"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :existing-fingerprints="existingFingerprints"
      :bill-dialog-visible="dialogs.billDialogVisible"
      :editing-bill="dialogs.editingBill"
      :account-dialog-visible="dialogs.accountDialogVisible"
      :editing-account="dialogs.editingAccount"
      :account-form-defaults="dialogs.accountFormDefaults"
      :category-dialog-visible="dialogs.categoryDialogVisible"
      :editing-category="dialogs.editingCategory"
      :category-form-defaults="dialogs.categoryFormDefaults"
      :budget-dialog-visible="dialogs.budgetDialogVisible"
      :editing-budget="dialogs.editingBudget"
      :statement-dialog-visible="dialogs.statementDialogVisible"
      :editing-statement="dialogs.editingStatement"
      :statement-list-dialog-visible="dialogs.statementListDialogVisible"
      :viewing-account="dialogs.viewingAccount"
      :viewing-account-statements="viewingAccountStatements"
      :import-dialog-visible="dialogs.importDialogVisible"
      :rule-dialog-visible="dialogs.ruleDialogVisible"
      :editing-rule="dialogs.editingRule"
      :balance-adjust-visible="dialogs.balanceAdjustVisible"
      :adjusting-account="dialogs.adjustingAccount"
      :balance-adjustments="dialogs.balanceAdjustments"
      :record-detail-visible="dialogs.recordDetailVisible"
      :viewing-record-id="dialogs.viewingRecordId"
      :record-detail-record="dialogs.recordDetailRecord"
      :batch-edit-visible="batchEditVisible"
      :selected-bills="selectedBills"
      :import-rule-dialog-visible="importRuleDialogVisible"
      :import-rule-dialog-form="importRuleDialogForm"
      @bill-confirm="handleBillConfirm"
      @bill-cancel="dialogs.closeBillDialog"
      @account-confirm="handleAccountConfirm"
      @account-cancel="dialogs.closeAccountDialog"
      @category-confirm="handleCategoryConfirm"
      @category-cancel="dialogs.closeCategoryDialog"
      @budget-confirm="handleBudgetConfirm"
      @budget-cancel="dialogs.closeBudgetDialog"
      @statement-confirm="handleStatementConfirm"
      @statement-cancel="dialogs.closeStatementDialog"
      @statement-list-close="dialogs.closeStatementList"
      @statement-edit="dialogs.openStatementEdit"
      @statement-generate="handleGenerateStatement"
      @import-cancel="dialogs.closeImportDialog"
      @import-record-created="handleRecordCreated"
      @import-view-record="handleViewRecord"
      @import-open-rules="onOpenRulesFromImport"
      @rule-confirm="handleRuleConfirm"
      @rule-cancel="dialogs.closeRuleDialog"
      @balance-adjust-confirm="handleBalanceAdjustConfirm"
      @balance-adjust-cancel="dialogs.closeBalanceAdjust"
      @balance-adjust-delete-record="handleDeleteBalanceAdjustment"
      @batch-edit-confirm="handleBatchEdit"
      @batch-edit-cancel="batchEditVisible = false"
      @record-import="handleImportRecord"
      @record-rollback="handleRollbackRecord"
      @record-delete="handleDeleteRecord"
      @record-detail-close="dialogs.closeRecordDetail"
      @import-rule-save="handleSaveImportRule"
      @import-rule-cancel="importRuleDialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory, BillFormData, AccountFormData, CategoryFormData, BudgetEntry, BudgetFormData, Statement, StatementFormData, CategoryTreeNode, ImportRule, ImportRuleFormData, CategoryType, ImportRecord, AccountType, BillingCreators, BalanceAdjustment, TabId, AccountCreatePayload } from '~/types/bill'
import { provide, inject, computed, ref, watch, onMounted, onBeforeUnmount, toRaw } from 'vue'
import { useModuleBase } from '~/composables/useModuleBase'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useBudgets } from '~/composables/useBudgets'
import { useStatements } from '~/composables/useStatements'
import { useImportRules } from '~/composables/useImportRules'
import { useImportRecords } from '~/composables/useImportRecords'
import { useConfirm } from '~/composables/useConfirm'
import { createBalanceAdjustment, loadBalanceAdjustments, deleteBalanceAdjustment } from '~/composables/useBalanceAdjustments'
import { dedupeKey } from '~/services/csvImport'
import BudgetDashboard from './components/BudgetDashboard.vue'
import { usePageHeaderStore } from '~/stores/pageHeader'

// Composables
import { useBillingNavigation } from './composables/useBillingNavigation'
import { useBillingFilters } from './composables/useBillingFilters'
import { useBillingDialogs } from './composables/useBillingDialogs'

// 布局组件
import BillingSidebar from './components/layout/BillingSidebar.vue'
import BillingMobileTabbar from './components/layout/BillingMobileTabbar.vue'
import CategoryContextMenu from './components/layout/CategoryContextMenu.vue'
import BillingDialogsLayer from './components/layout/BillingDialogsLayer.vue'

// 面板组件
import BillsTabPanel from './components/panels/BillsTabPanel.vue'
import AccountsTabPanel from './components/panels/AccountsTabPanel.vue'
import CategoriesTabPanel from './components/panels/CategoriesTabPanel.vue'
import BudgetsTabPanel from './components/panels/BudgetsTabPanel.vue'
import RulesTabPanel from './components/panels/RulesTabPanel.vue'

const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)
const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const { isMobile } = useDevice()
const pageHeaderStore = usePageHeaderStore()
const fab = useGlobalFab()

// 使用composables
const navigation = useBillingNavigation()
const filters = useBillingFilters(props.noteId)
const dialogs = useBillingDialogs()

// 使用现有composables获取数据
const { bills, loading, hasMore, totalIncome, totalExpense, netBalance, loadBillsPaginated, loadMoreBills, loadBillsByDateRange, createBill, createBillsBatch, updateBill, updateBills, deleteBill, deleteBills } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree, syncDefaultCategories, exportCategories, importCategories: importCategoriesBatch } = useBillCategories()
const { budgets, loadBudgets, upsertBudget, deleteBudget: removeBudget, resolveBudget, getMonthlyEquivalent } = useBudgets()
const { statements, loadStatements, updateStatement, generateForPeriod } = useStatements()
const { rules: importRules, loadImportRules, createImportRule, updateImportRule, deleteImportRule, deleteImportRules, updateImportRules, exportRules, importRules: importRulesBatch } = useImportRules()
const { loadImportRecords, fingerprintsAcrossRecords, getById, rollback, deleteImportRecord } = useImportRecords()
const { loadNotes, noteOptions } = useNotes()

// Provide共享数据（使用provide/inject避免prop drilling）
provide('billingDialogsState', toRaw(dialogs))
provide('billingNavigation', toRaw(navigation))
provide('billingFilters', toRaw(filters))
provide('noteId', props.noteId)
provide('accounts', accounts)
provide('categories', categories)
provide('noteOptions', noteOptions)

// existingFingerprints
const existingFingerprints = computed(() => {
  const set = new Set<string>()
  for (const b of bills.value) {
    set.add(dedupeKey(b.date, b.amount, b.counterpartyRaw || b.description || ''))
  }
  for (const fp of fingerprintsAcrossRecords.value) set.add(fp)
  return set
})

provide('existingFingerprints', existingFingerprints)

// Provide业务逻辑
const pendingAccountCallback = ref<((account: Account) => void) | null>(null)
const pendingCategoryCallback = ref<((category: BillCategory) => void) | null>(null)
const pendingRuleSavedCallback = ref<(() => void) | null>(null)

function handleCreateAccount(payload: AccountCreatePayload) {
  pendingAccountCallback.value = payload.onCreated ?? null
  dialogs.openAccountDialog(undefined, payload.defaultType)
}

function handleOpenCategoryForm(data: { type: CategoryType; defaultParentId?: string; defaultName?: string; onCreated?: (category: BillCategory) => void }) {
  pendingCategoryCallback.value = data.onCreated ?? null
  dialogs.openCategoryDialog(undefined, data.type)
}

function handleOpenImportRuleDialog(form: ImportRuleFormData, options?: { onSaved?: () => void }) {
  importRuleDialogForm.value = { ...form }
  pendingRuleSavedCallback.value = options?.onSaved ?? null
  importRuleDialogVisible.value = true
}

provide<BillingCreators>('billingCreators', {
  openAccountCreator: handleCreateAccount,
  openCategoryForm: handleOpenCategoryForm,
  openRuleDialog: handleOpenImportRuleDialog
})

// 使用频率统计（用于选择器排序）
const categoryFrequency = computed(() => {
  const map = new Map<string, number>()
  for (const b of bills.value) {
    if (b.categoryId) {
      map.set(b.categoryId, (map.get(b.categoryId) || 0) + 1)
    }
  }
  return map
})

const accountFrequency = computed(() => {
  const map = new Map<string, number>()
  for (const b of bills.value) {
    if (b.fromAccountId) map.set(b.fromAccountId, (map.get(b.fromAccountId) || 0) + 1)
    if (b.toAccountId) map.set(b.toAccountId, (map.get(b.toAccountId) || 0) + 1)
  }
  return map
})

provide('categoryFrequency', categoryFrequency)
provide('accountFrequency', accountFrequency)

// 筛选和预算相关状态（使用 useBillingFilters）
const billYearFilter = filters.billYearFilter
const billMonthFilter = filters.billMonthFilter
const billYearOptions = filters.billYearOptions
const billMonthOptions = filters.billMonthOptions
const isDateFiltered = filters.isDateFiltered
const currentBudgetYear = filters.currentBudgetYear
const currentBudgetMonth = filters.currentBudgetMonth

const budgetProgress = computed(() => {
  const year = currentBudgetYear.value
  const month = currentBudgetMonth.value
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  let totalBudget = 0
  const expenseCats = categories.value.filter(c => c.type === 'expense')
  for (const cat of expenseCats) {
    totalBudget += getMonthlyEquivalent(cat.id, year, month, props.noteId)
  }

  const actualExpense = bills.value
    .filter(b => b.type === 'expense' && b.status === 'completed' && b.date.startsWith(prefix))
    .reduce((sum, b) => sum + b.amount, 0)

  const hasBudget = totalBudget > 0
  const isOver = hasBudget && actualExpense > totalBudget
  const percentage = hasBudget ? Math.min(actualExpense / totalBudget, 1) : 0
  const rawPercentage = hasBudget ? actualExpense / totalBudget : 0

  return { totalBudget, actualExpense, percentage, rawPercentage, isOver, hasBudget }
})

const budgetYear = ref(new Date().getFullYear())

// 子Tab选项
const accountSubTabOptions = computed(() => [
  { value: 'personal' as AccountType, label: '个人账户' },
  { value: 'contact' as AccountType, label: '人员/组织' },
  { value: 'merchant' as AccountType, label: '商户' },
  { value: 'other' as AccountType, label: '其他' }
])

const categorySubTabOptions = computed(() => [
  { value: 'income' as CategoryType, label: '收入' },
  { value: 'expense' as CategoryType, label: '支出' }
])

// 树形结构
const incomeTree = computed(() => buildTree('income'))
const expenseTree = computed(() => buildTree('expense'))

// 批量操作相关
const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const batchEditVisible = ref(false)

const selectedBills = computed(() => bills.value.filter(b => selectedIds.value.includes(b.id)))

const filteredAccounts = computed(() => {
  return accounts.value.filter(a => a.type === navigation.activeAccountSubTab.value)
})

// 上下文菜单状态
interface CategoryMenuState {
  visible: boolean
  x: number
  y: number
  node: CategoryTreeNode | null
}

const categoryMenu = ref<CategoryMenuState>({
  visible: false,
  x: 0,
  y: 0,
  node: null
})

// 导入规则对话框
const importRuleDialogVisible = ref(false)
const importRuleDialogForm = ref<ImportRuleFormData>({
  source: 'all', matchField: 'account', matchMode: 'fuzzy', pattern: '', categoryId: '',
  accountId: '', priority: 100, enabled: true
})

// 账单周期相关
const viewingAccountStatements = computed(() =>
  dialogs.viewingAccount.value
    ? statements.value.filter(s => s.accountId === dialogs.viewingAccount.value!.id)
    : []
)

// 页面头部操作
function registerHeaderActions() {
  pageHeaderStore.setActions([
    { icon: 'solar:checklist-minimalistic-linear', label: '批量操作', handler: enterBatchMode },
    { icon: 'solar:upload-linear', label: '导入账单', handler: dialogs.openImportDialog },
    { icon: 'solar:download-linear', label: '导出账单', handler: handleExportBills }
  ])
}

function registerCategoryActions() {
  pageHeaderStore.setActions([
    { icon: 'solar:download-linear', label: '导出分类', handler: handleExportCategories },
    { icon: 'solar:upload-linear', label: '导入分类', handler: handleImportCategories },
    { icon: 'solar:cloud-download-linear', label: '分类初始化', handler: handleSyncDefaultCategories }
  ])
}

// 事件处理函数
function handleTabChange(tabId: TabId) {
  navigation.activeTab.value = tabId
}

function handleViewModeChange(mode: 'card' | 'table' | 'calendar') {
  navigation.viewMode.value = mode
}

function handleAccountSubTabChange(type: AccountType) {
  navigation.activeAccountSubTab.value = type
  navigation.activeTab.value = 'accounts'
}

function handleCategorySubTabChange(type: CategoryType) {
  navigation.activeCategorySubTab.value = type
  navigation.activeTab.value = 'categories'
}

function handleYearChange(year: number | null) {
  billYearFilter.value = year
  refreshBills()
}

function handleMonthChange(month: number | null) {
  billMonthFilter.value = month
  refreshBills()
}

function refreshBills() {
  selectedIds.value = []
  if (isDateFiltered.value || navigation.viewMode.value === 'calendar') {
    const { start, end } = getDateRange()
    loadBillsByDateRange(props.noteId, start, end)
  } else {
    loadBillsPaginated(props.noteId, 1)
  }
}

function getDateRange() {
  if (!isDateFiltered.value && navigation.viewMode.value !== 'calendar') return { start: undefined, end: undefined }
  const year = billYearFilter.value ?? new Date().getFullYear()
  const month = billMonthFilter.value ?? (navigation.viewMode.value === 'calendar' ? new Date().getMonth() + 1 : null)
  if (month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`
    return { start, end }
  }
  const start = `${year}-01-01T00:00:00.000Z`
  const end = `${year + 1}-01-01T00:00:00.000Z`
  return { start, end }
}

function onCalendarDateChange(year: number, month: number) {
  billYearFilter.value = year
  billMonthFilter.value = month
  refreshBills()
}

async function handleLoadMore() {
  if (isDateFiltered.value) return
  await loadMoreBills(props.noteId)
}

function enterBatchMode() {
  batchMode.value = true
  selectedIds.value = []
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = []
}

function toggleBillSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function selectAllBills() {
  selectedIds.value = bills.value.map(b => b.id)
}

function unselectAllBills() {
  selectedIds.value = []
}

function handleToggleSelectAll(select: boolean) {
  if (select) selectAllBills()
  else unselectAllBills()
}

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  const count = selectedIds.value.length
  if (!await confirm({ message: `确定删除选中的 ${count} 条账单？`, danger: true })) return
  try {
    const result = await deleteBills(selectedIds.value)
    showSuccess(`已删除 ${result.deletedCount} 条账单`)
    exitBatchMode()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchEdit(data: { categoryId?: string; fromAccountId?: string; toAccountId?: string; description?: string; descMode?: 'replace' | 'prefix' | 'suffix' }) {
  if (selectedIds.value.length === 0) return

  const patch: Partial<BillFormData> = {}
  if (data.categoryId) patch.categoryId = data.categoryId
  if (data.fromAccountId) patch.fromAccountId = data.fromAccountId
  if (data.toAccountId) patch.toAccountId = data.toAccountId

  try {
    if (data.description && data.descMode) {
      for (const id of selectedIds.value) {
        const bill = bills.value.find(b => b.id === id)
        if (!bill) continue
        let newDesc = bill.description
        if (data.descMode === 'replace') {
          newDesc = data.description
        } else if (data.descMode === 'prefix') {
          newDesc = data.description + newDesc
        } else if (data.descMode === 'suffix') {
          newDesc = newDesc + data.description
        }
        await updateBill(id, { ...patch, description: newDesc })
      }
    } else if (Object.keys(patch).length > 0) {
      const result = await updateBills(selectedIds.value, patch)
      if (result.failedIds.length > 0) {
        showError(`${result.failedIds.length} 条账单更新失败`)
      }
    }

    showSuccess('批量修改完成')
    batchEditVisible.value = false
    exitBatchMode()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

// CRUD操作处理
async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
    } else {
      await createBill(data, props.noteId)
    }
    dialogs.lastBillDefaults.value = {
      type: data.type,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: data.categoryId,
      currency: data.currency
    }
    dialogs.closeBillDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleAccountConfirm(data: AccountFormData, isEditing: boolean, id?: string) {
  try {
    let created: Account | undefined
    if (isEditing && id) {
      await updateAccount(id, data)
    } else {
      created = await createAccount(data)
      showSuccess('已添加账户')
    }
    if (created) {
      pendingAccountCallback.value?.(created)
    }
    pendingAccountCallback.value = null
    dialogs.closeAccountDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleCategoryConfirm(data: CategoryFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateCategory(id, data)
    } else {
      const created = await createCategory(data)
      pendingCategoryCallback.value?.(created)
    }
    pendingCategoryCallback.value = null
    dialogs.closeCategoryDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleBudgetConfirm(data: BudgetFormData, isEditing: boolean, id?: string) {
  try {
    if (!data.categoryId) {
      showError('请选择分类')
      return
    }
    if (data.amount <= 0) {
      showError('预算金额必须大于 0')
      return
    }
    await upsertBudget(data)
    dialogs.closeBudgetDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleStatementConfirm(data: StatementFormData, id: string) {
  try {
    if (data.statementAmount < 0 || data.paidAmount < 0) {
      showError('金额不能为负数')
      return
    }
    await updateStatement(id, data)
    dialogs.closeStatementDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleRuleConfirm(data: ImportRuleFormData, isEditing: boolean, id?: string) {
  try {
    if (!data.pattern.trim()) {
      showError('请输入匹配关键字')
      return
    }
    if (isEditing && id) {
      await updateImportRule(id, data)
    } else {
      await createImportRule(data)
    }
    dialogs.closeRuleDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleDeleteBill(id: string) {
  if (!await confirm('确定删除此账单？')) return
  await deleteBill(id)
}

async function handleDeleteAccount(id: string) {
  if (!await confirm('确定删除此账户？')) return
  await deleteAccount(id)
}

async function handleDeleteCategory(id: string) {
  if (!await confirm('确定删除此分类？')) return
  try {
    await deleteCategory(id)
    showSuccess('分类已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleSyncDefaultCategories() {
  if (!await confirm({
    message: '确定执行分类初始化？\n\n将保留您的自定义分类，仅添加默认分类中尚未存在的分类。',
  })) return
  try {
    const { created, skipped } = await syncDefaultCategories()
    showSuccess(`分类初始化完成：新增 ${created} 条分类，已存在 ${skipped} 条`)
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleExportCategories() {
  const data = exportCategories()
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `categories-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showSuccess('分类已导出')
}

function handleImportCategories() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const items = payload?.categories ?? payload
      if (!Array.isArray(items)) {
        showError('文件格式错误：分类列表应为数组')
        return
      }
      const { created, skipped } = await importCategoriesBatch(items)
      showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
    } catch (e) {
      showError(e instanceof Error ? e.message : '导入失败')
    }
  }
  input.click()
}

async function handleGenerateStatement(year: number, month: number) {
  if (!dialogs.viewingAccount.value) return
  try {
    await generateForPeriod(dialogs.viewingAccount.value, bills.value, year, month)
    showSuccess('账单周期已生成')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBalanceAdjustConfirm(data: { date: string; balance: number; note: string }) {
  if (!dialogs.adjustingAccount.value) return
  try {
    await createBalanceAdjustment(
      dialogs.adjustingAccount.value.id,
      data.date,
      data.balance,
      data.note
    )
    showSuccess('余额已调整')
    await loadBalanceAdjustHistory(dialogs.adjustingAccount.value.id)
    dialogs.closeBalanceAdjust()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function loadBalanceAdjustHistory(accountId: string) {
  try {
    dialogs.balanceAdjustments.value = await loadBalanceAdjustments(accountId)
  } catch (e) {
    console.error('Failed to load balance adjustments:', e)
  }
}

async function handleDeleteBalanceAdjustment(id: string) {
  if (!await confirm('确定删除此调整记录？')) return
  try {
    await deleteBalanceAdjustment(id)
    dialogs.balanceAdjustments.value = dialogs.balanceAdjustments.value.filter(a => a.id !== id)
    showSuccess('记录已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function onBudgetCellEdit(categoryId: string, year: number, month: number, noteId: string = '') {
  dialogs.editingBudget.value = null
  dialogs.budgetDialogVisible.value = true
}

function handleExportBills() {
  const headers = ['日期', '类型', '金额', '币种', '分类', '账户', '描述']
  const rows = bills.value.map(b => {
    const cat = categories.value.find(c => c.id === b.categoryId)
    const acc = accounts.value.find(a => a.id === b.fromAccountId || a.id === b.toAccountId)
    return [
      b.date,
      b.type === 'income' ? '收入' : b.type === 'expense' ? '支出' : b.type === 'transfer' ? '转账' : '债权债务',
      b.amount,
      b.currency,
      cat?.name || '',
      acc?.name || '',
      b.description
    ]
  })
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const year = billYearFilter.value
  const month = billMonthFilter.value
  const suffix = year ? (month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`) : new Date().toISOString().slice(0, 10)
  a.download = `bills-${suffix}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showSuccess('账单已导出')
}

function onOpenRulesFromImport() {
  dialogs.closeImportDialog()
  navigation.activeTab.value = 'rules'
}

async function handleDeleteRule(id: string) {
  if (!await confirm('确定删除此规则？')) return
  try {
    await deleteImportRule(id)
    showSuccess('规则已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleToggleRule(data: { id: string; enabled: boolean }) {
  try {
    await updateImportRule(data.id, { enabled: data.enabled })
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchDeleteRules(ids: string[]) {
  if (ids.length === 0) return
  const ok = await confirm({ message: `确定删除选中的 ${ids.length} 条规则？`, danger: true })
  if (!ok) return
  try {
    const { deleted, failed } = await deleteImportRules(ids)
    if (failed > 0) {
      showSuccess(`已删除 ${deleted} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已删除 ${deleted} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchEnableRules(ids: string[]) {
  if (ids.length === 0) return
  try {
    const { updated, failed } = await updateImportRules(ids, { enabled: true })
    if (failed > 0) {
      showSuccess(`已启用 ${updated} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已启用 ${updated} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchDisableRules(ids: string[]) {
  if (ids.length === 0) return
  try {
    const { updated, failed } = await updateImportRules(ids, { enabled: false })
    if (failed > 0) {
      showSuccess(`已禁用 ${updated} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已禁用 ${updated} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleExportRules() {
  const data = await exportRules()
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rules: data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `import-rules-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showSuccess('规则已导出')
}

function handleImportRules() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const items = payload?.rules ?? payload
      if (!Array.isArray(items)) {
        showError('文件格式错误：规则列表应为数组')
        return
      }
      const { created, skipped } = await importRulesBatch(items)
      showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
    } catch (e) {
      showError(e instanceof Error ? e.message : '导入失败')
    }
  }
  input.click()
}

async function handleSaveImportRule(form: ImportRuleFormData) {
  if (!form.pattern.trim()) {
    showError('请输入匹配关键字')
    return
  }
  try {
    await createImportRule({
      ...form,
      pattern: form.pattern.trim()
    })
    showSuccess('规则已保存')
    importRuleDialogVisible.value = false
    pendingRuleSavedCallback.value?.()
    pendingRuleSavedCallback.value = null
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleImportRecord(record: ImportRecord) {
  try {
    const result = await createBillsBatch(record, props.noteId)
    if (result.failedCount > 0) {
      showError(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条 · 失败 ${result.failedCount} 条`)
    } else {
      showSuccess(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条`)
    }
    dialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRollbackRecord(record: ImportRecord) {
  const ok = await confirm(`确定回滚此次导入?将删除 ${record.billIds.length} 条账单并恢复账户余额。`)
  if (!ok) return
  try {
    const { rolledBack, missing } = await rollback(record.id)
    if (missing > 0) {
      showSuccess(`已回滚 ${rolledBack} 条,${missing} 条已不存在`)
    } else {
      showSuccess(`已回滚 ${rolledBack} 条`)
    }
    dialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleDeleteRecord(recordId: string) {
  const ok = await confirm('确定删除此导入记录?')
  if (!ok) return
  try {
    await deleteImportRecord(recordId)
    showSuccess('导入记录已删除')
    dialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleRecordCreated(record: ImportRecord) {
  dialogs.closeImportDialog()
  dialogs.viewingRecordId.value = record.id
  dialogs.recordDetailVisible.value = true
}

function handleViewRecord(recordId: string) {
  dialogs.viewingRecordId.value = recordId
  dialogs.recordDetailVisible.value = true
}

// 上下文菜单操作
function navigateToCategoryDetail(node: CategoryTreeNode) {
  navigateTo('/billing/categories/' + node.id)
}

function navigateToAccountDetail(account: Account) {
  navigateTo('/billing/accounts/' + account.id)
}

function openCategoryContextMenu(payload: { node: CategoryTreeNode; x: number; y: number }) {
  const margin = 6
  const menuWidth = 180
  const menuHeight = 132
  const maxX = window.innerWidth - menuWidth - margin
  const maxY = window.innerHeight - menuHeight - margin
  categoryMenu.value = {
    visible: true,
    x: Math.min(payload.x, maxX),
    y: Math.min(payload.y, maxY),
    node: payload.node
  }
}

function closeCategoryMenu() {
  if (!categoryMenu.value.visible) return
  categoryMenu.value = { visible: false, x: 0, y: 0, node: null }
}

function openAddChildCategoryDialog(parent: CategoryTreeNode) {
  dialogs.editingCategory.value = null
  dialogs.categoryFormDefaults.value = { type: parent.type, defaultParentId: parent.id }
  dialogs.categoryDialogVisible.value = true
}

function onMenuAddChild() {
  if (categoryMenu.value.node) {
    openAddChildCategoryDialog(categoryMenu.value.node)
  }
  closeCategoryMenu()
}

function onMenuEdit() {
  if (categoryMenu.value.node) {
    dialogs.openCategoryDialog(categoryMenu.value.node)
  }
  closeCategoryMenu()
}

function onMenuDelete() {
  const node = categoryMenu.value.node
  closeCategoryMenu()
  if (node) {
    handleDeleteCategory(node.id)
  }
}

// 窗口事件
function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeCategoryMenu()
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    if (navigation.activeTab.value === 'bills' && !dialogs.billDialogVisible.value) {
      dialogs.openBillDialog()
    }
  }
}

function onWindowClick(e: MouseEvent) {
  closeCategoryMenu()
}

// 生命周期
onMounted(() => {
  fab.register('billing', () => dialogs.openBillDialog())

  const saved = localStorage.getItem('lifeos:bill-view-mode')
  if (saved === 'card' || saved === 'table') {
    navigation.viewMode.value = saved
  }
  const savedCollapsed = localStorage.getItem('lifeos:billing-sidebar-collapsed')
  if (savedCollapsed === '1') {
    navigation.sidebarCollapsed.value = true
  }

  window.addEventListener('click', onWindowClick)
  window.addEventListener('contextmenu', closeCategoryMenu, true)
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('resize', closeCategoryMenu)

  ;(async () => {
    try {
      await loadAccounts()
      await loadCategories()
      await Promise.all([refreshBills(), loadBudgets(), loadStatements(), loadImportRules(), loadImportRecords(props.noteId), loadNotes()])
      markReady()
    } catch (e) {
      handleError(e instanceof Error ? e : new Error(String(e)))
    }
  })()

  watch(navigation.activeTab, (tab) => {
    if (tab === 'bills') {
      registerHeaderActions()
    } else if (tab === 'categories') {
      registerCategoryActions()
    } else {
      pageHeaderStore.clearActions()
    }
  }, { immediate: true })
})

onBeforeUnmount(() => {
  pageHeaderStore.clearActions()
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('contextmenu', closeCategoryMenu, true)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('resize', closeCategoryMenu)
})

watch(navigation.viewMode, (mode) => {
  localStorage.setItem('lifeos:bill-view-mode', mode)
  if (mode === 'calendar') {
    refreshBills()
  } else if (mode === 'card' && !isDateFiltered.value) {
    refreshBills()
  }
})

watch(navigation.sidebarCollapsed, (collapsed) => {
  localStorage.setItem('lifeos:billing-sidebar-collapsed', collapsed ? '1' : '0')
})
</script>

<style scoped>
.billing-view {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
}

.billing-view.mobile {
  flex-direction: column;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content.mobile {
  flex: 1;
  overflow-y: auto;
}
</style>
