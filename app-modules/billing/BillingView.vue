<template>
  <div class="billing-view">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <Icon :name="tab.icon" size="16" />
        {{ tab.name }}
      </button>
    </div>

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
      <AccountList :accounts="accounts" @edit="openAccountDialog" @delete="handleDeleteAccount" />
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
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="closeDialog">取消</button>
          <button type="button" class="confirm-btn" @click="submitDialog">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory, BillFormData, AccountFormData, CategoryFormData } from '~/types/bill'
import { useModuleBase } from '~/composables/useModuleBase'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import BillList from './components/BillList.vue'
import BillForm from './components/BillForm.vue'
import AccountList from './components/AccountList.vue'
import AccountForm from './components/AccountForm.vue'
import CategoryTree from './components/CategoryTree.vue'
import CategoryForm from './components/CategoryForm.vue'

const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)

const { bills, totalIncome, totalExpense, netBalance, loadBills, createBill, updateBill, deleteBill } = useBills()
const { accounts, loadAccounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories, loadCategories, createCategory, updateCategory, deleteCategory, buildTree } = useBillCategories()

const activeTab = ref('bills')
const tabs = [
  { id: 'bills', name: '账单', icon: 'solar:wallet-money-linear' },
  { id: 'accounts', name: '账户', icon: 'solar:wallet-linear' },
  { id: 'categories', name: '分类', icon: 'solar:folder-linear' }
]

const dialogVisible = ref(false)
const dialogType = ref<'bill' | 'account' | 'category'>('bill')
const dialogTitle = computed(() => {
  if (dialogType.value === 'bill') return editingBill.value ? '编辑账单' : '记一笔'
  if (dialogType.value === 'account') return editingAccount.value ? '编辑账户' : '添加账户'
  return editingCategory.value ? '编辑分类' : '添加分类'
})

const editingBill = ref<Bill | null>(null)
const editingAccount = ref<Account | null>(null)
const editingCategory = ref<BillCategory | null>(null)

const billForm = ref<BillFormData>({
  type: 'expense', amount: 0, currency: 'CNY',
  fromAccountId: '', toAccountId: '', categoryId: '',
  title: '', description: '', date: new Date().toISOString().slice(0, 16),
  debtSubtype: 'lend', relatedPersonId: ''
})

const accountForm = ref<AccountFormData>({ name: '', type: 'personal', currency: 'CNY', icon: '', color: '' })
const categoryForm = ref<CategoryFormData>({ name: '', type: 'expense', parentId: '', icon: '', color: '' })

const incomeTree = computed(() => buildTree('income'))
const expenseTree = computed(() => buildTree('expense'))

onMounted(async () => {
  try {
    await Promise.all([loadAccounts(), loadCategories(), loadBills(props.noteId)])
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
    accountForm.value = { name: account.name, type: account.type, currency: account.currency, icon: account.icon || '', color: account.color || '' }
  } else {
    accountForm.value = { name: '', type: 'personal', currency: 'CNY', icon: '', color: '' }
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

async function submitDialog() {
  try {
    if (dialogType.value === 'bill') {
      if (!billForm.value.title || billForm.value.amount <= 0) return
      if (!billForm.value.fromAccountId || !billForm.value.toAccountId) {
        alert('请同时选择出账账户和入账账户')
        return
      }
      if (billForm.value.fromAccountId === billForm.value.toAccountId) {
        alert('出账与入账不能是同一账户')
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
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

function closeDialog() {
  dialogVisible.value = false
  editingBill.value = null
  editingAccount.value = null
  editingCategory.value = null
}
</script>

<style scoped>
.billing-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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
</style>
