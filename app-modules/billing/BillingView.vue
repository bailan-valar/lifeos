<template>
  <div class="billing-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <BillingSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 账单Tab -->
      <BillsTabPanel
        v-show="store.activeTab === 'bills'"
        :bills="bills"
        :batch-mode="batchMode"
        :selected-ids="selectedIds"
        :loading="loading"
        :has-more="hasMore"
        :bill-year-filter="billYearFilter"
        :bill-month-filter="billMonthFilter"
        :bill-year-options="store.billYearOptions"
        :bill-month-options="store.billMonthOptions"
        :budget-progress="budgetProgress"
        :is-date-filtered="isDateFiltered"
        :note-id="props.noteId"
        :existing-fingerprints="existingFingerprints"
        :delete-bills="deleteBills"
        :update-bills="updateBills"
        :create-bills-batch="createBillsBatch"
        :load-more-bills="loadMoreBills"
        @year-change="handleYearChange"
        @month-change="handleMonthChange"
        @calendar-date-change="onCalendarDateChange"
        @load-more="loadMoreBills"
        @record-created="handleRecordCreated"
        @view-record="handleViewRecord"
        @open-rules-from-import="onOpenRulesFromImport"
        @import-record="handleImportRecord"
        @rollback-record="handleRollbackRecord"
        @delete-record="handleDeleteRecord"
      />

      <!-- 账户Tab -->
      <AccountsTabPanel v-show="store.activeTab === 'accounts'" />

      <!-- 分类Tab -->
      <div v-show="store.activeTab === 'categories'" class="tab-panel-wrapper">
        <CategoriesTabPanel
          :income-tree="incomeTree"
          :expense-tree="expenseTree"
        />
      </div>

      <!-- 预算Tab -->
      <div v-show="store.activeTab === 'budgets'" class="tab-panel-wrapper">
        <BudgetsTabPanel
          :budget-year="budgetYear"
        />
      </div>

      <!-- 规则Tab -->
      <div v-show="store.activeTab === 'rules'" class="tab-panel-wrapper">
        <RulesTabPanel :import-rules="importRules" />
      </div>
    </div>

    <!-- 移动端Tab栏 -->
    <BillingMobileTabbar v-if="isMobile" />




  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory, BillFormData, AccountFormData, CategoryTreeNode, ImportRuleFormData, CategoryType, ImportRecord, BillingCreators, AccountCreatePayload, AccountType } from '~/types/bill'
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useModuleBase } from '~/composables/useModuleBase'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useBudgets } from '~/composables/useBudgets'
import { useStatements } from '~/composables/useStatements'
import { useImportRules } from '~/composables/useImportRules'
import { useImportRecords } from '~/composables/useImportRecords'
import { useConfirm } from '~/composables/useConfirm'
import { dedupeKey } from '~/services/csvImport'
import { usePageHeaderStore } from '~/stores/pageHeader'
import { storeToRefs } from 'pinia'
import { useBillingStore } from '~/stores/billing'

// Composables
import { useBillingBatch } from './composables/useBillingBatch'
import { useBillingExports } from './composables/useBillingExports'
import { useBillingImports } from './composables/useBillingImports'
import { useBillingLifecycle } from './composables/useBillingLifecycle'
import { useBillDialogs } from './composables/useBillDialogs'

// 布局组件
import BillingSidebar from './components/layout/BillingSidebar.vue'
import BillingMobileTabbar from './components/layout/BillingMobileTabbar.vue'

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
const store = useBillingStore()
const { billYearFilter, billMonthFilter, isDateFiltered, currentBudgetYear, currentBudgetMonth, activeTab, viewMode, sidebarCollapsed } = storeToRefs(store)

// 数据获取
const { bills, loading, hasMore, totalIncome, totalExpense, netBalance, loadBillsPaginated, loadMoreBills, loadBillsByDateRange, createBill, createBillsBatch, updateBill, updateBills, deleteBill, deleteBills } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree, syncDefaultCategories, exportCategories, importCategories: importCategoriesBatch } = useBillCategories()
const { budgets, loadBudgets, getMonthlyEquivalent } = useBudgets()
const { loadStatements } = useStatements()
const { rules: importRules, loadImportRules, createImportRule, exportRules, importRules: importRulesBatch } = useImportRules()
const { loadImportRecords, fingerprintsAcrossRecords, getById, rollback, deleteImportRecord } = useImportRecords()
const { loadNotes, noteOptions } = useNotes()

// 对话框状态
const billDialogs = useBillDialogs()

// 批量操作
const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const { enterBatchMode, exitBatchMode, toggleBillSelect, selectAllBills, unselectAllBills, handleToggleSelectAll, handleBatchDelete, handleBatchEdit } = useBillingBatch({
  batchMode, selectedIds, batchEditVisible: billDialogs.batchEditVisible,
  bills, deleteBills, updateBill, updateBills, confirm, showSuccess, showError
})

// 导入导出
const io = useBillingExports({
  bills, categories, accounts,
  billYearFilter,
  billMonthFilter,
  exportCategories, exportRules, showSuccess
})

const imports = useBillingImports({
  importCategoriesBatch, importRulesBatch, createImportRule: (data) => createImportRule(data).then(() => undefined), showSuccess, showError
})

// 生命周期
const lifecycle = useBillingLifecycle({
  openBillDialog: () => billDialogs.openBillDialog(),
  activeTab,
  billDialogVisible: computed(() => billDialogs.billDialogVisible.value)
})

// 现有指纹（用于导入去重）
const existingFingerprints = computed(() => {
  const set = new Set<string>()
  for (const b of bills.value) {
    set.add(dedupeKey(b.date, b.amount, b.counterpartyRaw || b.description || ''))
  }
  for (const fp of fingerprintsAcrossRecords.value) set.add(fp)
  return set
})

// Provide业务逻辑（深层组件需要）
async function handleCreateAccount(payload: AccountCreatePayload) {
  // TODO: 需要通过事件总线或 store 来触发 AccountsTabPanel 的对话框
  const account = await createAccount({
    name: payload.defaultName || '',
    type: (payload.defaultType || 'personal') as AccountType,
    currency: 'CNY',
    icon: '',
    color: ''
  })
  payload.onCreated?.(account)
}

async function handleOpenCategoryForm(data: { type: CategoryType; defaultParentId?: string; defaultName?: string; onCreated?: (category: BillCategory) => void }) {
  // TODO: 需要通过事件总线或 store 来触发 CategoriesTabPanel 的对话框
  const category = await createCategory({
    name: data.defaultName || '',
    type: data.type,
    parentId: data.defaultParentId || '',
    icon: '',
    color: ''
  })
  data.onCreated?.(category)
}

function handleOpenImportRuleDialog(form: ImportRuleFormData, options?: { onSaved?: () => void }) {
  // TODO: 需要通过事件总线或 store 来触发 RulesTabPanel 的对话框
  createImportRule(form).then(() => {
    options?.onSaved?.()
  })
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

// storeToRefs 已在上方解构出 billYearFilter, billMonthFilter, isDateFiltered 等

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
    { icon: 'solar:download-linear', label: '导出分类', handler: () => {} },
    { icon: 'solar:upload-linear', label: '导入分类', handler: () => {} },
    { icon: 'solar:cloud-download-linear', label: '分类初始化', handler: () => {} }
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
  if (isDateFiltered.value || store.viewMode === 'calendar') {
    const { start, end } = getDateRange()
    loadBillsByDateRange(props.noteId, start, end)
  } else {
    loadBillsPaginated(props.noteId, 1)
  }
}

function getDateRange() {
  if (!isDateFiltered.value && store.viewMode !== 'calendar') return { start: undefined, end: undefined }
  const year = billYearFilter.value ?? new Date().getFullYear()
  const month = billMonthFilter.value ?? (store.viewMode === 'calendar' ? new Date().getMonth() + 1 : null)
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

async function handleDeleteBill(id: string) {
  if (!await confirm('确定删除此账单？')) return
  await deleteBill(id)
}

function onOpenRulesFromImport() {
  billDialogs.closeImportDialog()
  store.activeTab = 'rules'
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
    store.viewMode = lifecycle.savedViewMode.value
  }
  if (lifecycle.savedSidebarCollapsed.value) {
    store.sidebarCollapsed = true
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

  watch(() => store.activeTab, (tab) => {
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

watch(() => store.viewMode, (mode) => {
  localStorage.setItem('lifeos:bill-view-mode', mode)
  if (mode === 'calendar') {
    refreshBills()
  } else if (mode === 'card' && !isDateFiltered.value) {
    refreshBills()
  }
})

watch(() => store.sidebarCollapsed, (collapsed) => {
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
