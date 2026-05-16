<template>
  <div class="billing-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <BillingSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 账单Tab -->
      <BillsTabPanel
        v-show="navigation.activeTab.value === 'bills'"
        :bills="bills"
        :batch-mode="batchMode"
        :selected-ids="selectedIds"
        :loading="loading"
        :has-more="hasMore"
        :bill-year-filter="billYearFilter"
        :bill-month-filter="billMonthFilter"
        :bill-year-options="filters.billYearOptions.value"
        :bill-month-options="filters.billMonthOptions"
        :budget-progress="budgetProgress"
        :is-date-filtered="isDateFiltered"
        @year-change="handleYearChange"
        @month-change="handleMonthChange"
        @toggle-select-all="handleToggleSelectAll"
        @batch-delete="handleBatchDelete"
        @exit-batch-mode="exitBatchMode"
        @edit-bill="billDialogs.openBillDialog"
        @delete-bill="handleDeleteBill"
        @select-bill="toggleBillSelect"
        @select-all-bills="selectAllBills"
        @unselect-all-bills="unselectAllBills"
        @calendar-date-change="(data) => onCalendarDateChange(data.year, data.month)"
        @load-more="handleLoadMore"
        @bill-confirm="handleBillConfirm"
        @batch-edit-confirm="handleBatchEdit"
        @record-created="handleRecordCreated"
        @view-record="handleViewRecord"
        @open-rules-from-import="onOpenRulesFromImport"
        @import-record="handleImportRecord"
        @rollback-record="handleRollbackRecord"
        @delete-record="handleDeleteRecord"
      />

      <!-- 账户Tab -->
      <AccountsTabPanel
        v-show="navigation.activeTab.value === 'accounts'"
        @delete-account="handleDeleteAccount"
        @account-confirm="handleAccountConfirm"
        @balance-adjust-confirm="handleBalanceAdjustConfirm"
        @delete-balance-adjustment="handleDeleteBalanceAdjustment"
        @statement-confirm="handleStatementConfirm"
        @generate-statement="handleGenerateStatement"
        @statement-list-close="accountDialogs.closeStatementList"
      />

      <!-- 分类Tab -->
      <div v-show="navigation.activeTab.value === 'categories'" class="tab-panel-wrapper">
        <CategoriesTabPanel
          :income-tree="incomeTree"
          :expense-tree="expenseTree"
          @export-categories="io.handleExportCategories"
          @import-categories="imports.handleImportCategories"
          @sync-default-categories="handleSyncDefaultCategories"
          @delete-category="handleDeleteCategory"
          @add-child-category="openAddChildCategoryDialog"
          @category-contextmenu="openCategoryContextMenu"
          @category-confirm="handleCategoryConfirm"
        />
      </div>

      <!-- 预算Tab -->
      <div v-show="navigation.activeTab.value === 'budgets'" class="tab-panel-wrapper">
        <BudgetsTabPanel
          :budget-year="budgetYear"
          @edit-budget-cell="(data) => onBudgetCellEdit(data.categoryId, data.year, data.month, data.noteId)"
          @category-contextmenu="openCategoryContextMenu"
          @budget-confirm="handleBudgetConfirm"
        />
      </div>

      <!-- 规则Tab -->
      <div v-show="navigation.activeTab.value === 'rules'" class="tab-panel-wrapper">
        <RulesTabPanel
          :import-rules="importRules"
          @delete-rule="handleDeleteRule"
          @toggle-rule="handleToggleRule"
          @export-rules="io.handleExportRules"
          @import-rules="imports.handleImportRules"
          @batch-delete-rules="handleBatchDeleteRules"
          @batch-enable-rules="handleBatchEnableRules"
          @batch-disable-rules="handleBatchDisableRules"
          @rule-confirm="handleRuleConfirm"
        />
      </div>
    </div>

    <!-- 移动端Tab栏 -->
    <BillingMobileTabbar v-if="isMobile" />

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
import { usePageHeaderStore } from '~/stores/pageHeader'

// Composables
import { useBillingNavigation } from './composables/useBillingNavigation'
import { useBillingFilters } from './composables/useBillingFilters'
import { useBillingBatch } from './composables/useBillingBatch'
import { useBillingCategoryMenu } from './composables/useBillingCategoryMenu'
import { useBillingExports } from './composables/useBillingExports'
import { useBillingImports } from './composables/useBillingImports'
import { useBillingLifecycle } from './composables/useBillingLifecycle'
import { useBillDialogs } from './composables/useBillDialogs'
import { useAccountDialogs } from './composables/useAccountDialogs'
import { useCategoryDialogs } from './composables/useCategoryDialogs'
import { useBudgetDialogs } from './composables/useBudgetDialogs'
import { useRuleDialogs } from './composables/useRuleDialogs'

// 布局组件
import BillingSidebar from './components/layout/BillingSidebar.vue'
import BillingMobileTabbar from './components/layout/BillingMobileTabbar.vue'
import CategoryContextMenu from './components/layout/CategoryContextMenu.vue'

// 面板组件
import BillsTabPanel from './components/panels/BillsTabPanel.vue'
import AccountsTabPanel from './components/panels/AccountsTabPanel.vue'
import CategoriesTabPanel from './components/panels/CategoriesTabPanel.vue'
import BudgetsTabPanel from './components/panels/BudgetsTabPanel.vue'
import RulesTabPanel from './components/panels/RulesTabPanel.vue'

// 对话框组件


const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)
const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const { isMobile } = useDevice()
const pageHeaderStore = usePageHeaderStore()
const fab = useGlobalFab()

// 导航与筛选
const navigation = useBillingNavigation()
const filters = useBillingFilters(props.noteId)

// 数据获取
const { bills, loading, hasMore, totalIncome, totalExpense, netBalance, loadBillsPaginated, loadMoreBills, loadBillsByDateRange, createBill, createBillsBatch, updateBill, updateBills, deleteBill, deleteBills } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree, syncDefaultCategories, exportCategories, importCategories: importCategoriesBatch } = useBillCategories()
const { budgets, loadBudgets, upsertBudget, deleteBudget: removeBudget, resolveBudget, getMonthlyEquivalent } = useBudgets()
const { statements, loadStatements, updateStatement, generateForPeriod } = useStatements()
const { rules: importRules, loadImportRules, createImportRule, updateImportRule, deleteImportRule, deleteImportRules, updateImportRules, exportRules, importRules: importRulesBatch } = useImportRules()
const { loadImportRecords, fingerprintsAcrossRecords, getById, rollback, deleteImportRecord } = useImportRecords()
const { loadNotes, noteOptions } = useNotes()

// 对话框状态
const billDialogs = useBillDialogs()
const accountDialogs = useAccountDialogs()
const categoryDialogs = useCategoryDialogs()
const budgetDialogs = useBudgetDialogs()
const ruleDialogs = useRuleDialogs()

// 批量操作
const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const { enterBatchMode, exitBatchMode, toggleBillSelect, selectAllBills, unselectAllBills, handleToggleSelectAll, handleBatchDelete, handleBatchEdit } = useBillingBatch({
  batchMode, selectedIds, batchEditVisible: billDialogs.batchEditVisible,
  bills, deleteBills, updateBill, updateBills, confirm, showSuccess, showError
})

// 分类上下文菜单
const categoryMenu = ref({
  visible: false, x: 0, y: 0, node: null as CategoryTreeNode | null
})
const { openCategoryContextMenu, closeCategoryMenu, openAddChildCategoryDialog, onMenuAddChild, onMenuEdit, onMenuDelete } = useBillingCategoryMenu({
  categoryMenu,
  openCategoryDialog: (cat?: BillCategory, type?: CategoryType) => categoryDialogs.openCategoryDialog(cat, type),
  handleDeleteCategory
})

// 导入导出
const io = useBillingExports({
  bills, categories, accounts,
  billYearFilter: filters.billYearFilter,
  billMonthFilter: filters.billMonthFilter,
  exportCategories, exportRules, showSuccess
})

const imports = useBillingImports({
  importCategoriesBatch, importRulesBatch, createImportRule: (data) => createImportRule(data).then(() => undefined), showSuccess, showError
})

// 生命周期
const lifecycle = useBillingLifecycle({
  closeCategoryMenu,
  openBillDialog: () => billDialogs.openBillDialog(),
  activeTab: computed(() => navigation.activeTab.value),
  billDialogVisible: computed(() => billDialogs.billDialogVisible.value)
})

// Provide共享数据
provide('billingNavigation', toRaw(navigation))
provide('billingFilters', toRaw(filters))
provide('noteId', props.noteId)
provide('accounts', accounts)
provide('categories', categories)
provide('statements', statements)
provide('noteOptions', noteOptions)
provide('billDialogs', billDialogs)
provide('accountDialogs', accountDialogs)
provide('categoryDialogs', categoryDialogs)
provide('budgetDialogs', budgetDialogs)
provide('ruleDialogs', ruleDialogs)

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
  accountDialogs.editingAccount.value = null
  accountDialogs.accountFormDefaults.value = {
    defaultName: payload.defaultName,
    defaultType: payload.defaultType
  }
  accountDialogs.accountDialogVisible.value = true
}

function handleOpenCategoryForm(data: { type: CategoryType; defaultParentId?: string; defaultName?: string; onCreated?: (category: BillCategory) => void }) {
  pendingCategoryCallback.value = data.onCreated ?? null
  categoryDialogs.editingCategory.value = null
  categoryDialogs.categoryFormDefaults.value = {
    type: data.type,
    defaultParentId: data.defaultParentId,
    defaultName: data.defaultName
  }
  categoryDialogs.categoryDialogVisible.value = true
}

function handleOpenImportRuleDialog(form: ImportRuleFormData, options?: { onSaved?: () => void }) {
  imports.importRuleDialogForm.value = { ...form }
  pendingRuleSavedCallback.value = options?.onSaved ?? null
  imports.importRuleDialogVisible.value = true
}

provide<BillingCreators>('billingCreators', {
  openAccountCreator: handleCreateAccount,
  openCategoryForm: handleOpenCategoryForm,
  openRuleDialog: handleOpenImportRuleDialog
})

// 使用频率统计
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

// 筛选和预算相关状态
const billYearFilter = filters.billYearFilter
const billMonthFilter = filters.billMonthFilter
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

// 树形结构
const incomeTree = computed(() => buildTree('income'))
const expenseTree = computed(() => buildTree('expense'))

const selectedBills = computed(() => bills.value.filter(b => selectedIds.value.includes(b.id)))

// 页面头部操作
function registerHeaderActions() {
  pageHeaderStore.setActions([
    { icon: 'solar:checklist-minimalistic-linear', label: '批量操作', handler: enterBatchMode },
    { icon: 'solar:upload-linear', label: '导入账单', handler: () => billDialogs.openImportDialog() },
    { icon: 'solar:download-linear', label: '导出账单', handler: io.handleExportBills }
  ])
}

function registerCategoryActions() {
  pageHeaderStore.setActions([
    { icon: 'solar:download-linear', label: '导出分类', handler: io.handleExportCategories },
    { icon: 'solar:upload-linear', label: '导入分类', handler: imports.handleImportCategories },
    { icon: 'solar:cloud-download-linear', label: '分类初始化', handler: handleSyncDefaultCategories }
  ])
}

// 事件处理函数
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

// CRUD操作处理
async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
    } else {
      await createBill(data, props.noteId)
    }
    billDialogs.lastBillDefaults.value = {
      type: data.type,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: data.categoryId,
      currency: data.currency
    }
    billDialogs.closeBillDialog()
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
    accountDialogs.closeAccountDialog()
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
    categoryDialogs.closeCategoryDialog()
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
    budgetDialogs.closeBudgetDialog()
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
    accountDialogs.closeStatementDialog()
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
    ruleDialogs.closeRuleDialog()
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

async function handleGenerateStatement(year: number, month: number) {
  if (!accountDialogs.viewingAccount.value) return
  try {
    await generateForPeriod(accountDialogs.viewingAccount.value, bills.value, year, month)
    showSuccess('账单周期已生成')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBalanceAdjustConfirm(data: { date: string; balance: number; note: string }) {
  if (!accountDialogs.adjustingAccount.value) return
  try {
    await createBalanceAdjustment(
      accountDialogs.adjustingAccount.value.id,
      data.date,
      data.balance,
      data.note
    )
    showSuccess('余额已调整')
    await loadBalanceAdjustHistory(accountDialogs.adjustingAccount.value.id)
    accountDialogs.closeBalanceAdjust()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function loadBalanceAdjustHistory(accountId: string) {
  try {
    accountDialogs.balanceAdjustments.value = await loadBalanceAdjustments(accountId)
  } catch (e) {
    console.error('Failed to load balance adjustments:', e)
  }
}

async function handleDeleteBalanceAdjustment(id: string) {
  if (!await confirm('确定删除此调整记录？')) return
  try {
    await deleteBalanceAdjustment(id)
    accountDialogs.balanceAdjustments.value = accountDialogs.balanceAdjustments.value.filter(a => a.id !== id)
    showSuccess('记录已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function onBudgetCellEdit(categoryId: string, year: number, month: number, noteId: string = '') {
  budgetDialogs.editingBudget.value = null
  budgetDialogs.budgetDialogVisible.value = true
}

function onOpenRulesFromImport() {
  billDialogs.closeImportDialog()
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

async function handleImportRecord(record: ImportRecord) {
  try {
    const result = await createBillsBatch(record, props.noteId)
    if (result.failedCount > 0) {
      showError(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条 · 失败 ${result.failedCount} 条`)
    } else {
      showSuccess(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条`)
    }
    billDialogs.closeRecordDetail()
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
    billDialogs.closeRecordDetail()
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
    billDialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleRecordCreated(record: ImportRecord) {
  billDialogs.closeImportDialog()
  billDialogs.setRecordDetailRecord(record)
  billDialogs.recordDetailVisible.value = true
}

function handleViewRecord(recordId: string) {
  const record = getById(recordId)
  billDialogs.setRecordDetailRecord(record)
  billDialogs.recordDetailVisible.value = true
}

// 生命周期
onMounted(() => {
  fab.register('billing', () => billDialogs.openBillDialog())

  if (lifecycle.savedViewMode.value) {
    navigation.viewMode.value = lifecycle.savedViewMode.value
  }
  if (lifecycle.savedSidebarCollapsed.value) {
    navigation.sidebarCollapsed.value = true
  }

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
  padding: 16px;
}

.tab-panel-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content.mobile {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
