<template>
  <div class="billing-view">
    <div class="sidebar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="sidebar-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <Icon :name="tab.icon" size="18" />
        <span>{{ tab.name }}</span>
      </button>
    </div>

    <div class="content">
      <div v-if="activeTab === 'bills'" class="tab-panel">
      <div class="panel-header">
        <div class="stats-bar">
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
        <button type="button" class="add-btn" @click="openBillDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          记一笔
        </button>
      </div>
      <BillList :bills="bills" @edit="openBillDialog" @delete="handleDeleteBill" />
    </div>

    <div v-if="activeTab === 'accounts'" class="tab-panel">
      <div class="panel-header">
        <h4>账户管理</h4>
        <button type="button" class="add-btn" @click="openAccountDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          添加账户
        </button>
      </div>
      <AccountList
        :accounts="accounts"
        @edit="openAccountDialog"
        @delete="handleDeleteAccount"
        @view-statements="openStatementList"
      />
    </div>

    <div v-if="activeTab === 'categories'" class="tab-panel">
      <div class="panel-header">
        <h4>分类管理</h4>
        <button type="button" class="add-btn" @click="openCategoryDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          添加分类
        </button>
      </div>
      <div class="category-section">
        <div class="category-subtitle">收入分类</div>
        <CategoryTree :nodes="incomeTree" @edit="openCategoryDialog" @delete="handleDeleteCategory" />
      </div>
      <div class="category-section">
        <div class="category-subtitle">支出分类</div>
        <CategoryTree :nodes="expenseTree" @edit="openCategoryDialog" @delete="handleDeleteCategory" />
      </div>
    </div>

    <div v-if="activeTab === 'budgets'" class="tab-panel">
      <div class="panel-header">
        <h4>预算看板</h4>
        <div class="budget-controls">
          <select v-model.number="budgetYear" class="form-select year-select">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select v-model.number="budgetMonth" class="form-select month-select">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <button type="button" class="add-btn" @click="openBudgetDialog()">
            <Icon name="solar:add-circle-linear" size="18" />
            设置预算
          </button>
        </div>
      </div>
      <BudgetDashboard
        :bills="bills"
        :budgets="budgets"
        :categories="categories"
        :year="budgetYear"
        :month="budgetMonth"
      />
    </div>
    </div>

    <div v-if="dialogVisible" class="dialog-overlay" @click="closeDialog">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ dialogTitle }}</h3>
          <button type="button" class="close-btn" @click="closeDialog">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <BillForm
            v-if="dialogType === 'bill'"
            v-model="billForm"
            :accounts="accounts"
            :categories="categories"
          />
          <AccountForm
            v-if="dialogType === 'account'"
            v-model="accountForm"
          />
          <CategoryForm
            v-if="dialogType === 'category'"
            v-model="categoryForm"
            :categories="categories"
            :exclude-id="editingCategory?.id"
          />
          <BudgetForm
            v-if="dialogType === 'budget'"
            v-model="budgetForm"
            :categories="categories"
          />
          <StatementList
            v-if="dialogType === 'statement-list' && viewingAccount"
            :account="viewingAccount"
            :statements="viewingAccountStatements"
            @edit="openStatementEdit"
            @generate="handleGenerateStatement"
          />
          <StatementForm
            v-if="dialogType === 'statement'"
            v-model="statementForm"
          />
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="closeDialog">{{ dialogType === 'statement-list' ? '关闭' : '取消' }}</button>
          <button v-if="dialogType !== 'statement-list'" type="button" class="confirm-btn" @click="submitDialog">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory, BillFormData, AccountFormData, CategoryFormData, BudgetEntry, BudgetFormData, Statement, StatementFormData } from '~/types/bill'
import { useModuleBase } from '~/composables/useModuleBase'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useBudgets } from '~/composables/useBudgets'
import { useStatements } from '~/composables/useStatements'
import BillList from './components/BillList.vue'
import BillForm from './components/BillForm.vue'
import AccountList from './components/AccountList.vue'
import AccountForm from './components/AccountForm.vue'
import CategoryTree from './components/CategoryTree.vue'
import CategoryForm from './components/CategoryForm.vue'
import BudgetForm from './components/BudgetForm.vue'
import BudgetDashboard from './components/BudgetDashboard.vue'
import StatementList from './components/StatementList.vue'
import StatementForm from './components/StatementForm.vue'

const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)
const { success: showSuccess, error: showError } = useToast()

const { bills, totalIncome, totalExpense, netBalance, loadBills, createBill, updateBill, deleteBill } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree } = useBillCategories()
const { budgets, loadBudgets, createBudget, updateBudget, deleteBudget: deleteBudgetEntry } = useBudgets()
const { statements, loadStatements, updateStatement, generateForPeriod } = useStatements()

const activeTab = ref('bills')
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
  { id: 'budgets', name: '预算', icon: 'solar:chart-2-linear' }
]

const dialogVisible = ref(false)
const dialogType = ref<'bill' | 'account' | 'category' | 'budget' | 'statement-list' | 'statement'>('bill')
const dialogTitle = computed(() => {
  if (dialogType.value === 'bill') return editingBill.value ? '编辑账单' : '记一笔'
  if (dialogType.value === 'account') return editingAccount.value ? '编辑账户' : '添加账户'
  if (dialogType.value === 'category') return editingCategory.value ? '编辑分类' : '添加分类'
  if (dialogType.value === 'statement-list') return viewingAccount.value ? `${viewingAccount.value.name} 账单周期` : '账单周期'
  if (dialogType.value === 'statement') return '编辑账单周期'
  return editingBudget.value ? '编辑预算' : '设置预算'
})

const editingBill = ref<Bill | null>(null)
const editingAccount = ref<Account | null>(null)
const editingCategory = ref<BillCategory | null>(null)
const editingBudget = ref<BudgetEntry | null>(null)
const viewingAccount = ref<Account | null>(null)
const editingStatement = ref<Statement | null>(null)

const viewingAccountStatements = computed(() =>
  viewingAccount.value
    ? statements.value.filter(s => s.accountId === viewingAccount.value!.id)
    : []
)

const billForm = ref<BillFormData>({
  type: 'expense', amount: 0, currency: 'CNY',
  fromAccountId: '', toAccountId: '', categoryId: '',
  title: '', description: '', date: new Date().toISOString().slice(0, 16),
  debtSubtype: 'lend', relatedPersonId: ''
})

const accountForm = ref<AccountFormData>({ name: '', type: 'personal', currency: 'CNY', icon: '', color: '' })
const categoryForm = ref<CategoryFormData>({ name: '', type: 'expense', parentId: '', icon: '', color: '' })
const budgetForm = ref<BudgetFormData>({
  categoryId: '', period: 'monthly', amount: 0,
  year: new Date().getFullYear(), month: new Date().getMonth() + 1
})

const statementForm = ref<StatementFormData>({
  statementAmount: 0, minimumPayment: 0, paidAmount: 0, status: 'pending'
})

const incomeTree = computed(() => buildTree('income'))
const expenseTree = computed(() => buildTree('expense'))

onMounted(async () => {
  try {
    await Promise.all([loadAccounts(), loadCategories(), loadBills(props.noteId), loadBudgets(), loadStatements()])
    markReady()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
})

function openBillDialog(bill?: Bill) {
  dialogType.value = 'bill'
  editingBill.value = bill || null
  if (bill) {
    billForm.value = {
      type: bill.type, amount: bill.amount, currency: bill.currency,
      fromAccountId: bill.fromAccountId, toAccountId: bill.toAccountId,
      categoryId: bill.categoryId, title: bill.title,
      description: bill.description, date: bill.date.slice(0, 16),
      debtSubtype: bill.debtSubtype || 'lend',
      relatedPersonId: bill.relatedPersonId
    }
  } else {
    billForm.value = {
      type: 'expense', amount: 0, currency: 'CNY',
      fromAccountId: '', toAccountId: '', categoryId: '',
      title: '', description: '', date: new Date().toISOString().slice(0, 16),
      debtSubtype: 'lend', relatedPersonId: ''
    }
  }
  dialogVisible.value = true
}

function openAccountDialog(account?: Account) {
  dialogType.value = 'account'
  editingAccount.value = account || null
  if (account) {
    const base: AccountFormData = {
      name: account.name,
      type: account.type,
      currency: account.currency,
      icon: account.icon || '',
      color: account.color || ''
    }
    if (account.type === 'personal') {
      base.subtype = account.subtype || 'cash'
      if (base.subtype === 'credit_card') {
        base.creditLimit = account.creditLimit ?? 0
        base.billingDay = account.billingDay ?? 1
        base.repaymentDay = account.repaymentDay ?? 1
      }
    }
    accountForm.value = base
  } else {
    accountForm.value = { name: '', type: 'personal', currency: 'CNY', icon: '', color: '', subtype: 'cash' }
  }
  dialogVisible.value = true
}

function openCategoryDialog(category?: BillCategory) {
  dialogType.value = 'category'
  editingCategory.value = category || null
  if (category) {
    categoryForm.value = { name: category.name, type: category.type, parentId: category.parentId, icon: category.icon || '', color: category.color || '' }
  } else {
    categoryForm.value = { name: '', type: 'expense', parentId: '', icon: '', color: '' }
  }
  dialogVisible.value = true
}

function openBudgetDialog(budget?: BudgetEntry) {
  dialogType.value = 'budget'
  editingBudget.value = budget || null
  if (budget) {
    budgetForm.value = {
      categoryId: budget.categoryId, period: budget.period, amount: budget.amount,
      year: budget.year, month: budget.month
    }
  } else {
    budgetForm.value = {
      categoryId: '', period: 'monthly', amount: 0,
      year: new Date().getFullYear(), month: new Date().getMonth() + 1
    }
  }
  dialogVisible.value = true
}

function openStatementList(account: Account) {
  dialogType.value = 'statement-list'
  viewingAccount.value = account
  dialogVisible.value = true
}

function openStatementEdit(stmt: Statement) {
  dialogType.value = 'statement'
  editingStatement.value = stmt
  statementForm.value = {
    statementAmount: stmt.statementAmount,
    minimumPayment: stmt.minimumPayment,
    paidAmount: stmt.paidAmount,
    status: stmt.status
  }
  dialogVisible.value = true
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

async function submitDialog() {
  try {
    if (dialogType.value === 'bill') {
      if (!billForm.value.title) {
        showError('请输入标题')
        return
      }
      if (billForm.value.amount <= 0) {
        showError('金额必须大于 0')
        return
      }

      const t = billForm.value.type
      if (t === 'expense' && !billForm.value.fromAccountId) {
        showError('请选择出账账户')
        return
      }
      if (t === 'income' && !billForm.value.toAccountId) {
        showError('请选择入账账户')
        return
      }
      if (t === 'transfer' && (!billForm.value.fromAccountId || !billForm.value.toAccountId)) {
        showError('转账需要同时选择出账账户和入账账户')
        return
      }
      if (billForm.value.fromAccountId && billForm.value.toAccountId &&
          billForm.value.fromAccountId === billForm.value.toAccountId) {
        showError('出账与入账不能是同一账户')
        return
      }

      if (editingBill.value) {
        await updateBill(editingBill.value.id, billForm.value)
      } else {
        await createBill(billForm.value, props.noteId)
      }
    } else if (dialogType.value === 'account') {
      if (!accountForm.value.name) return
      if (editingAccount.value) {
        await updateAccount(editingAccount.value.id, accountForm.value)
      } else {
        await createAccount(accountForm.value)
      }
    } else if (dialogType.value === 'category') {
      if (!categoryForm.value.name) return
      if (editingCategory.value) {
        await updateCategory(editingCategory.value.id, categoryForm.value)
      } else {
        await createCategory(categoryForm.value)
      }
    } else if (dialogType.value === 'budget') {
      if (!budgetForm.value.categoryId) {
        showError('请选择分类')
        return
      }
      if (budgetForm.value.amount <= 0) {
        showError('预算金额必须大于 0')
        return
      }
      if (editingBudget.value) {
        await updateBudget(editingBudget.value.id, budgetForm.value)
      } else {
        await createBudget(budgetForm.value)
      }
    } else if (dialogType.value === 'statement') {
      if (!editingStatement.value) {
        closeDialog()
        return
      }
      if (statementForm.value.statementAmount < 0 || statementForm.value.paidAmount < 0) {
        showError('金额不能为负数')
        return
      }
      await updateStatement(editingStatement.value.id, statementForm.value)
    } else if (dialogType.value === 'statement-list') {
      closeDialog()
      return
    }
    closeDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleDeleteBill(id: string) {
  if (!confirm('确定删除此账单？')) return
  await deleteBill(id)
}

async function handleDeleteAccount(id: string) {
  if (!confirm('确定删除此账户？')) return
  await deleteAccount(id)
}

async function handleDeleteCategory(id: string) {
  if (!confirm('确定删除此分类？')) return
  try {
    await deleteCategory(id)
    showSuccess('分类已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleDeleteBudgetEntry(id: string) {
  if (!confirm('确定删除此预算？')) return
  await deleteBudgetEntry(id)
}

function closeDialog() {
  dialogVisible.value = false
  editingBill.value = null
  editingAccount.value = null
  editingCategory.value = null
  editingBudget.value = null
  viewingAccount.value = null
  editingStatement.value = null
}
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
}
.sidebar-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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
  overflow-y: auto;
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
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
}
.dialog-body {
  padding: 20px;
}
.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}
.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
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
</style>
