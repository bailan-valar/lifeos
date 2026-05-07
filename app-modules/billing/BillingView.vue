<template>
  <div class="billing-view">
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <button
        type="button"
        class="sidebar-toggle"
        :title="sidebarCollapsed ? '展开' : '收起'"
        @click="toggleSidebar"
      >
        <Icon
          :name="sidebarCollapsed ? 'solar:double-alt-arrow-right-linear' : 'solar:double-alt-arrow-left-linear'"
          size="16"
        />
      </button>
      <template v-for="tab in tabs" :key="tab.id">
        <template v-if="tab.id === 'accounts'">
          <button
            type="button"
            class="sidebar-btn"
            :class="{ active: activeTab === 'accounts' }"
            :title="sidebarCollapsed ? tab.name : ''"
            @click="onAccountsTabClick"
          >
            <Icon :name="tab.icon" size="18" />
            <span class="sidebar-btn-text">{{ tab.name }}</span>
            <Icon
              v-if="!sidebarCollapsed"
              name="solar:alt-arrow-down-linear"
              size="14"
              class="submenu-chevron"
              :class="{ expanded: accountsMenuExpanded }"
            />
          </button>
          <div
            v-if="!sidebarCollapsed && accountsMenuExpanded"
            class="sidebar-submenu"
          >
            <button
              v-for="sub in accountSubTabs"
              :key="sub.type"
              type="button"
              class="sidebar-submenu-btn"
              :class="{ active: activeTab === 'accounts' && activeAccountSubTab === sub.type }"
              @click="activeTab = 'accounts'; activeAccountSubTab = sub.type"
            >
              {{ sub.label }}
            </button>
          </div>
        </template>
        <template v-else-if="tab.id === 'categories'">
          <button
            type="button"
            class="sidebar-btn"
            :class="{ active: activeTab === 'categories' }"
            :title="sidebarCollapsed ? tab.name : ''"
            @click="onCategoriesTabClick"
          >
            <Icon :name="tab.icon" size="18" />
            <span class="sidebar-btn-text">{{ tab.name }}</span>
            <Icon
              v-if="!sidebarCollapsed"
              name="solar:alt-arrow-down-linear"
              size="14"
              class="submenu-chevron"
              :class="{ expanded: categoryMenuExpanded }"
            />
          </button>
          <div
            v-if="!sidebarCollapsed && categoryMenuExpanded"
            class="sidebar-submenu"
          >
            <button
              v-for="sub in categorySubTabs"
              :key="sub.type"
              type="button"
              class="sidebar-submenu-btn"
              :class="{ active: activeTab === 'categories' && activeCategorySubTab === sub.type }"
              @click="activeTab = 'categories'; activeCategorySubTab = sub.type"
            >
              <span class="sub-dot" :class="sub.type" />
              {{ sub.label }}
            </button>
          </div>
        </template>
        <button
          v-else
          type="button"
          class="sidebar-btn"
          :class="{ active: activeTab === tab.id }"
          :title="sidebarCollapsed ? tab.name : ''"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
        </button>
      </template>
    </div>

    <div class="content">
      <div v-if="activeTab === 'bills'" class="tab-panel">
      <div class="panel-header">
        <div v-if="!batchMode" class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">收入</span>
            <span class="stat-value positive">+{{ totalIncome.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">支出</span>
            <span class="stat-value negative">-{{ totalExpense.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">结余</span>
            <span class="stat-value" :class="netBalance >= 0 ? 'positive' : 'negative'">
              {{ netBalance >= 0 ? '+' : '' }}{{ netBalance.toFixed(2) }}
            </span>
          </div>
        </div>
        <BillBatchToolbar
          v-else
          :selected-count="selectedIds.length"
          :total-count="bills.length"
          @toggle-select-all="handleToggleSelectAll"
          @batch-delete="handleBatchDelete"
          @batch-edit="batchEditVisible = true"
          @exit="exitBatchMode"
        />
        <div class="date-filter">
          <select v-model="billYearFilter" class="filter-select" @change="refreshBills">
            <option :value="null">全部年份</option>
            <option v-for="y in billYearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select v-model="billMonthFilter" class="filter-select" @change="refreshBills">
            <option :value="null">全部月份</option>
            <option v-for="m in billMonthOptions" :key="m" :value="m">{{ m }}月</option>
          </select>
        </div>
        <div class="view-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'card' }"
            @click="viewMode = 'card'"
          >
            <Icon name="solar:widget-2-linear" size="16" />
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <Icon name="solar:clipboard-list-linear" size="16" />
          </button>
        </div>
        <div v-if="!batchMode" class="header-actions">
          <button type="button" class="add-btn secondary" @click="enterBatchMode">
            <Icon name="solar:checklist-minimalistic-linear" size="18" />
            批量
          </button>
          <button type="button" class="add-btn secondary" @click="openImportDialog()">
            <Icon name="solar:upload-linear" size="18" />
            导入
          </button>
          <button type="button" class="add-btn" @click="openBillDialog()">
            <Icon name="solar:add-circle-linear" size="18" />
            记一笔
          </button>
        </div>
      </div>
      <div class="list-container">
        <div v-if="loading && bills.length === 0" class="skeleton-wrap">
          <div v-for="i in 5" :key="i" class="skeleton-row" />
        </div>
        <BillList
          v-else-if="viewMode === 'card'"
          :bills="bills"
          :selectable="batchMode"
          :selected-ids="selectedIds"
          @edit="openBillDialog"
          @delete="handleDeleteBill"
          @select="toggleBillSelect"
          @select-all="selectAllBills"
          @unselect-all="unselectAllBills"
        />
        <BillTable
          v-else
          :bills="bills"
          :accounts="accounts"
          :categories="categories"
          :selectable="batchMode"
          :selected-ids="selectedIds"
          @edit="openBillDialog"
          @delete="handleDeleteBill"
          @select="toggleBillSelect"
          @select-all="selectAllBills"
          @unselect-all="unselectAllBills"
        />
      </div>
      <div v-if="hasMore && !isDateFiltered && !batchMode" class="load-more-wrap">
        <button
          type="button"
          class="load-more-btn"
          :disabled="loading"
          @click="handleLoadMore"
        >
          <span v-if="loading">加载中...</span>
          <span v-else>加载更多</span>
        </button>
      </div>

      <button
        v-if="activeTab === 'bills' && !batchMode"
        type="button"
        class="fab-btn"
        title="记一笔 (Ctrl+N)"
        @click="openBillDialog()"
      >
        <Icon name="solar:add-circle-linear" size="24" />
      </button>
    </div>

    <div v-if="activeTab === 'accounts'" class="tab-panel">
      <div class="panel-header">
        <h4>{{ accountSubTabTitle }}</h4>
        <button type="button" class="add-btn" @click="openAccountDialog(undefined, activeAccountSubTab)">
          <Icon name="solar:add-circle-linear" size="18" />
          添加账户
        </button>
      </div>
      <div class="list-container">
        <AccountList
          :accounts="filteredAccounts"
          @edit="openAccountDialog"
          @delete="handleDeleteAccount"
          @view-statements="openStatementList"
        />
      </div>
    </div>

    <div v-if="activeTab === 'categories'" class="tab-panel">
      <div class="panel-header">
        <h4>{{ categorySubTabTitle }}</h4>
        <div class="header-actions">
          <button type="button" class="add-btn secondary" @click="handleExportCategories">
            <Icon name="solar:download-linear" size="18" />
            导出
          </button>
          <button type="button" class="add-btn secondary" @click="handleImportCategories">
            <Icon name="solar:upload-linear" size="18" />
            导入
          </button>
          <button type="button" class="add-btn secondary" @click="handleSyncDefaultCategories">
            <Icon name="solar:cloud-download-linear" size="18" />
            分类初始化
          </button>
          <button type="button" class="add-btn" @click="openCategoryDialog(undefined, activeCategorySubTab === 'all' ? undefined : activeCategorySubTab)">
            <Icon name="solar:add-circle-linear" size="18" />
            添加分类
          </button>
        </div>
      </div>
      <div class="category-list-container">
        <div v-if="activeCategorySubTab === 'all' || activeCategorySubTab === 'income'" class="category-section">
          <div class="category-subtitle">收入分类</div>
          <CategoryTree
            :nodes="incomeTree"
            @edit="openCategoryDialog"
            @delete="handleDeleteCategory"
            @add-child="openAddChildCategoryDialog"
            @view-detail="navigateToCategoryDetail"
            @contextmenu="openCategoryContextMenu"
          />
        </div>
        <div v-if="activeCategorySubTab === 'all' || activeCategorySubTab === 'expense'" class="category-section">
          <div class="category-subtitle">支出分类</div>
          <CategoryTree
            :nodes="expenseTree"
            @edit="openCategoryDialog"
            @delete="handleDeleteCategory"
            @add-child="openAddChildCategoryDialog"
            @view-detail="navigateToCategoryDetail"
            @contextmenu="openCategoryContextMenu"
          />
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'budgets'" class="tab-panel">
      <BudgetDashboard
        :year="budgetYear"
        @edit-cell="onBudgetCellEdit"
        @category-contextmenu="openCategoryContextMenu"
      />
    </div>

    <div v-if="activeTab === 'rules'" class="tab-panel">
      <ImportRuleList
        :rules="importRules"
        :accounts="accounts"
        :categories="categories"
        @add="openRuleDialog()"
        @edit="openRuleDialog"
        @delete="handleDeleteRule"
        @toggle="handleToggleRule"
        @export="handleExportRules"
        @import="handleImportRules"
        @batch-delete="handleBatchDeleteRules"
        @batch-enable="handleBatchEnableRules"
        @batch-disable="handleBatchDisableRules"
      />
    </div>
    </div>

    <div
      v-if="categoryMenu.visible && categoryMenu.node"
      class="context-menu"
      :style="{ top: `${categoryMenu.y}px`, left: `${categoryMenu.x}px` }"
      @click.stop
    >
      <button type="button" class="context-menu-item" @click="onMenuAddChild">
        <Icon name="solar:add-circle-linear" size="14" />
        <span>新增子分类</span>
      </button>
      <button type="button" class="context-menu-item" @click="onMenuEdit">
        <Icon name="solar:pen-linear" size="14" />
        <span>编辑</span>
      </button>
      <button type="button" class="context-menu-item danger" @click="onMenuDelete">
        <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
        <span>删除</span>
      </button>
    </div>

    <BillBatchEditDialog
      v-if="batchEditVisible"
      :selected-bills="selectedBills"
      :accounts="accounts"
      :categories="categories"
      @confirm="handleBatchEdit"
      @cancel="batchEditVisible = false"
    />

    <ImportRuleDialog
      v-if="importRuleDialogVisible"
      v-model:form="importRuleDialogForm"
      :accounts="accounts"
      :categories="categories"
      @confirm="handleSaveImportRule"
      @cancel="importRuleDialogVisible = false"
    />

    <ImportRecordDetail
      v-if="recordDetailVisible && recordDetailRecord"
      ref="recordDetailRef"
      :visible="recordDetailVisible"
      :record="recordDetailRecord"
      :accounts="accounts"
      :categories="categories"
      @close="recordDetailVisible = false"
      @import="handleImportRecord"
      @rollback="handleRollbackRecord"
      @delete="handleDeleteRecord"
    />

    <BillDialog
      v-if="billDialogVisible"
      ref="billDialogRef"
      :visible="billDialogVisible"
      :bill="editingBill || undefined"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :default-note-id="props.noteId"
      :default-form-values="editingBill ? undefined : lastBillDefaults || undefined"
      @confirm="handleBillConfirm"
      @cancel="billDialogVisible = false; editingBill = null"
    />

    <AccountDialog
      v-if="accountDialogVisible"
      :visible="accountDialogVisible"
      :account="editingAccount || undefined"
      :categories="categories"
      :default-name="accountFormDefaults?.defaultName"
      :default-type="accountFormDefaults?.defaultType"
      @confirm="handleAccountConfirm"
      @cancel="accountDialogVisible = false; editingAccount = null; accountFormDefaults = null"
    />

    <CategoryDialog
      v-if="categoryDialogVisible"
      :visible="categoryDialogVisible"
      :category="editingCategory || undefined"
      :categories="categories"
      :exclude-id="editingCategory?.id"
      :default-type="categoryFormDefaults?.type"
      :default-parent-id="categoryFormDefaults?.defaultParentId"
      :default-name="categoryFormDefaults?.defaultName"
      @confirm="handleCategoryConfirm"
      @cancel="categoryDialogVisible = false; editingCategory = null; categoryFormDefaults = null"
    />

    <BudgetDialog
      v-if="budgetDialogVisible"
      ref="budgetDialogRef"
      :visible="budgetDialogVisible"
      :budget="editingBudget || undefined"
      :categories="categories"
      :note-options="noteOptions"
      @confirm="handleBudgetConfirm"
      @cancel="budgetDialogVisible = false; editingBudget = null"
    />

    <StatementDialog
      v-if="statementDialogVisible"
      :visible="statementDialogVisible"
      :statement="editingStatement || undefined"
      @confirm="handleStatementConfirm"
      @cancel="statementDialogVisible = false; editingStatement = null"
    />

    <StatementListDialog
      v-if="statementListDialogVisible"
      :visible="statementListDialogVisible"
      :account="viewingAccount || undefined"
      :statements="viewingAccountStatements"
      @edit="openStatementEdit"
      @generate="handleGenerateStatement"
      @close="statementListDialogVisible = false; viewingAccount = null"
    />

    <ImportDialog
      v-if="importDialogVisible"
      ref="importDialogRef"
      :visible="importDialogVisible"
      :note-id="props.noteId"
      :accounts="accounts"
      :categories="categories"
      :existing-fingerprints="existingFingerprints"
      @cancel="importDialogVisible = false"
      @record-created="handleRecordCreated"
      @view-record="handleViewRecord"
    />

    <RuleDialog
      v-if="ruleDialogVisible"
      :visible="ruleDialogVisible"
      :rule="editingRule || undefined"
      :accounts="accounts"
      :categories="categories"
      @confirm="handleRuleConfirm"
      @cancel="ruleDialogVisible = false; editingRule = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory, BillFormData, AccountFormData, AccountCreatePayload, CategoryFormData, BudgetEntry, BudgetFormData, Statement, StatementFormData, CategoryTreeNode, ImportRule, ImportRuleFormData, CategoryType, ImportRecord, AccountType, BillingCreators } from '~/types/bill'
import { provide } from 'vue'
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
import BillList from './components/BillList.vue'
import BillTable from './components/BillTable.vue'
import BillDialog from './components/BillDialog.vue'
import AccountList from './components/AccountList.vue'
import AccountDialog from './components/AccountDialog.vue'
import CategoryTree from './components/CategoryTree.vue'
import CategoryDialog from './components/CategoryDialog.vue'
import BudgetDialog from './components/BudgetDialog.vue'
import BudgetDashboard from './components/BudgetDashboard.vue'
import StatementListDialog from './components/StatementListDialog.vue'
import StatementDialog from './components/StatementDialog.vue'
import ImportDialog from './components/ImportDialog.vue'
import ImportRuleList from './components/ImportRuleList.vue'
import RuleDialog from './components/RuleDialog.vue'
import BillBatchToolbar from './components/BillBatchToolbar.vue'
import BillBatchEditDialog from './components/BillBatchEditDialog.vue'
import ImportRuleDialog from './components/ImportRuleDialog.vue'
import ImportRecordDetail from './components/ImportRecordDetail.vue'

const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)
const { success: showSuccess, error: showError } = useToast()

const { bills, loading, hasMore, totalIncome, totalExpense, netBalance, loadBillsPaginated, loadMoreBills, loadBillsByDateRange, createBill, createBillsBatch, updateBill, updateBills, deleteBill, deleteBills } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree, ensureDefaultCategories, syncDefaultCategories, exportCategories, importCategories: importCategoriesBatch } = useBillCategories()
const { loadBudgets, upsertBudget, deleteBudget: removeBudget, resolveBudget } = useBudgets()
const { statements, loadStatements, updateStatement, generateForPeriod } = useStatements()
const { rules: importRules, loadImportRules, createImportRule, updateImportRule, deleteImportRule, deleteImportRules, updateImportRules, exportRules, importRules: importRulesBatch } = useImportRules()
const { loadImportRecords, fingerprintsAcrossRecords, getById, rollback, deleteImportRecord } = useImportRecords()
const { loadNotes, noteOptions } = useNotes()

const activeTab = ref('bills')
const viewMode = ref<'card' | 'table'>('card')
const VIEW_MODE_KEY = 'lifeos:bill-view-mode'
const SIDEBAR_COLLAPSED_KEY = 'lifeos:billing-sidebar-collapsed'
const sidebarCollapsed = ref(false)

const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const batchEditVisible = ref(false)

const billYearFilter = ref<number | null>(null)
const billMonthFilter = ref<number | null>(null)
const billYearOptions = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})
const billMonthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const isDateFiltered = computed(() => billYearFilter.value !== null || billMonthFilter.value !== null)

function getDateRange() {
  if (!isDateFiltered.value) return { start: undefined, end: undefined }
  const year = billYearFilter.value ?? new Date().getFullYear()
  const month = billMonthFilter.value
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

async function refreshBills() {
  selectedIds.value = []
  if (isDateFiltered.value) {
    const { start, end } = getDateRange()
    await loadBillsByDateRange(props.noteId, start, end)
  } else {
    await loadBillsPaginated(props.noteId, 1)
  }
}

async function handleLoadMore() {
  if (isDateFiltered.value) return
  await loadMoreBills(props.noteId)
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
}
const budgetYear = ref(new Date().getFullYear())
const budgetMonth = ref(new Date().getMonth() + 1)
const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return [current - 1, current, current + 1]
})
const tabs = [
  { id: 'bills', name: '账单', icon: 'solar:wallet-money-linear' },
  { id: 'accounts', name: '账户', icon: 'solar:wallet-linear' },
  { id: 'categories', name: '分类', icon: 'solar:folder-linear' },
  { id: 'budgets', name: '预算', icon: 'solar:chart-2-linear' },
  { id: 'rules', name: '规则', icon: 'solar:filter-linear' }
]

const accountSubTabs = [
  { type: 'personal' as AccountType, label: '个人账户' },
  { type: 'contact' as AccountType, label: '人员/组织' },
  { type: 'merchant' as AccountType, label: '商户' }
]
const activeAccountSubTab = ref<AccountType>('personal')
const accountsMenuExpanded = ref(true)
const accountSubTabTitle = computed(() => {
  const map: Record<string, string> = {
    personal: '个人账户',
    contact: '人员/组织',
    merchant: '商户'
  }
  return map[activeAccountSubTab.value] || '账户管理'
})
const filteredAccounts = computed(() => {
  return accounts.value.filter(a => a.type === activeAccountSubTab.value)
})

function onAccountsTabClick() {
  if (activeTab.value === 'accounts') {
    accountsMenuExpanded.value = !accountsMenuExpanded.value
  } else {
    activeTab.value = 'accounts'
    accountsMenuExpanded.value = true
  }
}

const categorySubTabs = [
  { type: 'income' as CategoryType, label: '收入' },
  { type: 'expense' as CategoryType, label: '支出' }
]
const activeCategorySubTab = ref<CategoryType | 'all'>('all')
const categoryMenuExpanded = ref(true)
const categorySubTabTitle = computed(() => {
  const map: Record<string, string> = {
    all: '分类管理',
    income: '收入分类',
    expense: '支出分类'
  }
  return map[activeCategorySubTab.value] || '分类管理'
})

function onCategoriesTabClick() {
  if (activeTab.value === 'categories') {
    categoryMenuExpanded.value = !categoryMenuExpanded.value
  } else {
    activeTab.value = 'categories'
    categoryMenuExpanded.value = true
  }
}

/* ---------- 各弹框显隐与编辑状态 ---------- */
const billDialogVisible = ref(false)
const accountDialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const budgetDialogVisible = ref(false)
const statementDialogVisible = ref(false)
const statementListDialogVisible = ref(false)
const importDialogVisible = ref(false)
const ruleDialogVisible = ref(false)

const editingBill = ref<Bill | null>(null)
const editingAccount = ref<Account | null>(null)
const editingCategory = ref<BillCategory | null>(null)
const categoryFormDefaults = ref<{ type?: CategoryType; defaultParentId?: string; defaultName?: string } | null>(null)
const accountFormDefaults = ref<{ defaultName?: string; defaultType?: AccountType } | null>(null)
const editingBudget = ref<BudgetEntry | null>(null)
const viewingAccount = ref<Account | null>(null)
const editingStatement = ref<Statement | null>(null)
const editingRule = ref<ImportRule | null>(null)

const billDialogRef = ref<InstanceType<typeof BillDialog> | null>(null)
const budgetDialogRef = ref<InstanceType<typeof BudgetDialog> | null>(null)
const importDialogRef = ref<InstanceType<typeof ImportDialog> | null>(null)
const recordDetailRef = ref<InstanceType<typeof ImportRecordDetail> | null>(null)

const recordDetailVisible = ref(false)
const viewingRecordId = ref<string | null>(null)
const recordDetailRecord = computed(() =>
  viewingRecordId.value ? getById(viewingRecordId.value) : null
)

const importRuleDialogVisible = ref(false)
const importRuleDialogForm = ref<ImportRuleFormData>({
  source: 'all', matchField: 'account', matchMode: 'fuzzy', pattern: '', categoryId: '',
  accountId: '', priority: 100, enabled: true
})
const pendingAccountCallback = ref<((account: Account) => void) | null>(null)
const pendingCategoryCallback = ref<((category: BillCategory) => void) | null>(null)
const pendingRuleSavedCallback = ref<(() => void) | null>(null)

/* ---------- 智能记忆：同笔记连续记账默认值 ---------- */
const lastBillDefaults = ref<Partial<BillFormData> | null>(null)

const existingFingerprints = computed(() => {
  const set = new Set<string>()
  for (const b of bills.value) {
    set.add(dedupeKey(b.date, b.amount, b.counterpartyRaw || b.description || ''))
  }
  for (const fp of fingerprintsAcrossRecords.value) set.add(fp)
  return set
})

const viewingAccountStatements = computed(() =>
  viewingAccount.value
    ? statements.value.filter(s => s.accountId === viewingAccount.value!.id)
    : []
)

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


const incomeTree = computed(() => buildTree('income'))
const expenseTree = computed(() => buildTree('expense'))

/* ---------- 使用频率统计（用于选择器排序） ---------- */
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

onMounted(async () => {
  const saved = localStorage.getItem(VIEW_MODE_KEY)
  if (saved === 'card' || saved === 'table') {
    viewMode.value = saved
  }
  const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
  if (savedCollapsed === '1') {
    sidebarCollapsed.value = true
  }
  try {
    await loadAccounts()
    await loadCategories()
    const initialized = await ensureDefaultCategories()
    if (initialized) {
      showSuccess('已为您初始化默认分类')
    }
    await Promise.all([refreshBills(), loadBudgets(), loadStatements(), loadImportRules(), loadImportRecords(props.noteId), loadNotes()])
    markReady()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
})

watch(viewMode, (mode) => {
  localStorage.setItem(VIEW_MODE_KEY, mode)
})

function openBillDialog(bill?: Bill) {
  editingBill.value = bill || null
  billDialogVisible.value = true
}

function openAccountDialog(account?: Account, defaultType?: AccountType) {
  editingAccount.value = account || null
  if (!account && defaultType) {
    accountFormDefaults.value = { defaultType }
  }
  accountDialogVisible.value = true
}

function openCategoryDialog(category?: BillCategory, defaultType?: CategoryType) {
  editingCategory.value = category || null
  categoryFormDefaults.value = defaultType ? { type: defaultType } : null
  categoryDialogVisible.value = true
}

function openBudgetDialog(budget?: BudgetEntry) {
  editingBudget.value = budget || null
  budgetDialogVisible.value = true
}

function onBudgetCellEdit(categoryId: string, year: number, month: number, noteId: string = '') {
  editingBudget.value = null
  budgetDialogVisible.value = true
}

function openStatementList(account: Account) {
  viewingAccount.value = account
  statementListDialogVisible.value = true
}

function openStatementEdit(stmt: Statement) {
  editingStatement.value = stmt
  statementDialogVisible.value = true
}

async function handleGenerateStatement(year: number, month: number) {
  if (!viewingAccount.value) return
  try {
    await generateForPeriod(viewingAccount.value, bills.value, year, month)
    showSuccess('账单周期已生成')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

/* ---------- 各弹框保存确认 ---------- */
async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
    } else {
      await createBill(data, props.noteId)
    }
    // 记忆本次记账值，用于下次快速填充
    lastBillDefaults.value = {
      type: data.type,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: data.categoryId,
      currency: data.currency
    }
    billDialogVisible.value = false
    editingBill.value = null
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
    accountDialogVisible.value = false
    editingAccount.value = null
    accountFormDefaults.value = null
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
      billDialogRef.value?.setCategoryId(created.id)
      budgetDialogRef.value?.setCategoryId(created.id)
      pendingCategoryCallback.value?.(created)
    }
    pendingCategoryCallback.value = null
    categoryDialogVisible.value = false
    editingCategory.value = null
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
    budgetDialogVisible.value = false
    editingBudget.value = null
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
    statementDialogVisible.value = false
    editingStatement.value = null
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
    ruleDialogVisible.value = false
    editingRule.value = null
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const { confirm } = useConfirm()

const selectedBills = computed(() => bills.value.filter(b => selectedIds.value.includes(b.id)))

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

async function handleDeleteBudgetEntry(id: string) {
  if (!await confirm('确定删除此预算？')) return
  await removeBudget(id)
}


function handleOpenImportRuleDialog(form: ImportRuleFormData, options?: { onSaved?: () => void }) {
  importRuleDialogForm.value = { ...form }
  pendingRuleSavedCallback.value = options?.onSaved ?? null
  importRuleDialogVisible.value = true
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

function navigateToCategoryDetail(node: CategoryTreeNode) {
  navigateTo('/billing/categories/' + node.id)
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
  editingCategory.value = null
  categoryFormDefaults.value = { type: parent.type, defaultParentId: parent.id }
  categoryDialogVisible.value = true
}

function onMenuAddChild() {
  if (categoryMenu.value.node) {
    openAddChildCategoryDialog(categoryMenu.value.node)
  }
  closeCategoryMenu()
}

function onMenuEdit() {
  if (categoryMenu.value.node) {
    openCategoryDialog(categoryMenu.value.node)
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

function handleOpenCategoryForm(data: { type: CategoryType; defaultParentId?: string; defaultName?: string; onCreated?: (category: BillCategory) => void }) {
  editingCategory.value = null
  pendingCategoryCallback.value = data.onCreated ?? null
  categoryFormDefaults.value = data
  categoryDialogVisible.value = true
}

async function handleCreateAccount(payload: AccountCreatePayload) {
  pendingAccountCallback.value = payload.onCreated ?? null
  editingAccount.value = null
  accountFormDefaults.value = {
    defaultName: payload.defaultName || undefined,
    defaultType: payload.defaultType || undefined
  }
  accountDialogVisible.value = true
}

provide<BillingCreators>('billingCreators', {
  openAccountCreator: handleCreateAccount,
  openCategoryForm: handleOpenCategoryForm,
  openRuleDialog: handleOpenImportRuleDialog
})

provide('categoryFrequency', categoryFrequency)
provide('accountFrequency', accountFrequency)

function openImportDialog() {
  importDialogVisible.value = true
}

function openRuleDialog(rule?: ImportRule) {
  editingRule.value = rule || null
  ruleDialogVisible.value = true
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

async function handleToggleRule(id: string, enabled: boolean) {
  try {
    await updateImportRule(id, { enabled })
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

function handleRecordCreated(record: ImportRecord) {
  importDialogVisible.value = false
  importDialogRef.value?.reset()
  viewingRecordId.value = record.id
  recordDetailVisible.value = true
}

function handleViewRecord(recordId: string) {
  viewingRecordId.value = recordId
  recordDetailVisible.value = true
}

async function handleImportRecord(record: ImportRecord) {
  try {
    const result = await createBillsBatch(record, props.noteId)
    if (result.failedCount > 0) {
      showError(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条 · 失败 ${result.failedCount} 条`)
    } else {
      showSuccess(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条`)
    }
    recordDetailVisible.value = false
    viewingRecordId.value = null
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  } finally {
    recordDetailRef.value?.setImporting(false)
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
    recordDetailVisible.value = false
    viewingRecordId.value = null
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
    recordDetailVisible.value = false
    viewingRecordId.value = null
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeCategoryMenu()
  // Cmd/Ctrl + N 快速记账
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    if (activeTab.value === 'bills' && !billDialogVisible.value) {
      openBillDialog()
    }
  }
}

onMounted(() => {
  window.addEventListener('click', closeCategoryMenu)
  window.addEventListener('contextmenu', closeCategoryMenu, true)
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('resize', closeCategoryMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeCategoryMenu)
  window.removeEventListener('contextmenu', closeCategoryMenu, true)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('resize', closeCategoryMenu)
})
</script>

<style scoped>
.billing-view {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 160px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-right: 0.5px solid rgba(60, 60, 67, 0.08);
  flex-shrink: 0;
  transition: width 0.2s ease;
}
.sidebar.collapsed {
  width: 48px;
  padding: 12px 6px;
  align-items: center;
}
.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  align-self: flex-end;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}
.sidebar-toggle:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
}
.sidebar.collapsed .sidebar-toggle {
  align-self: center;
  margin-bottom: 8px;
}
.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  white-space: nowrap;
}
.sidebar-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.sidebar.collapsed .sidebar-btn {
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
}
.sidebar-btn-text {
  transition: opacity 0.15s ease;
}
.sidebar.collapsed .sidebar-btn-text {
  display: none;
}
.submenu-chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
  color: rgba(60, 60, 67, 0.4);
}
.submenu-chevron.expanded {
  transform: rotate(180deg);
}
.sidebar-submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
  margin-left: 8px;
  border-left: 1.5px solid rgba(60, 60, 67, 0.08);
}
.sidebar-submenu-btn {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  white-space: nowrap;
}
.sidebar-submenu-btn:hover {
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.92);
}
.sidebar-submenu-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}
.sub-dot.income {
  background: rgb(52, 199, 89);
}
.sub-dot.expense {
  background: rgb(255, 59, 48);
}
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow: hidden;
}
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.panel-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.stats-bar {
  display: flex;
  gap: 16px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}
.stat-value {
  font-size: 15px;
  font-weight: 700;
}
.stat-value.positive {
  color: rgb(52, 199, 89);
}
.stat-value.negative {
  color: rgb(255, 59, 48);
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.add-btn:hover {
  background: rgb(0, 110, 250);
}
.add-btn.secondary {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.92);
}
.add-btn.secondary:hover {
  background: rgba(60, 60, 67, 0.18);
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.date-filter {
  display: flex;
  gap: 6px;
  align-items: center;
}
.filter-select {
  padding: 6px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  cursor: pointer;
}
.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
.load-more-btn {
  padding: 8px 24px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}
.load-more-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}
.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}
.skeleton-row {
  height: 56px;
  background: linear-gradient(90deg, rgba(60, 60, 67, 0.06) 25%, rgba(60, 60, 67, 0.1) 50%, rgba(60, 60, 67, 0.06) 75%);
  background-size: 200% 100%;
  border-radius: 10px;
  animation: skeleton-shimmer 1.5s infinite;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
}
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}
.toggle-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.category-list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.category-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.category-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.budget-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.budget-controls .form-select {
  padding: 6px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.budget-controls .year-select {
  min-width: 90px;
}
.budget-controls .month-select {
  min-width: 70px;
}
.context-menu {
  position: fixed;
  min-width: 160px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
  text-align: left;
}
.context-menu-item:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.context-menu-item.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
.fab-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  z-index: 100;
}
.fab-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 24px rgba(0, 122, 255, 0.45);
}
.fab-btn:active {
  transform: scale(0.95);
}
</style>
