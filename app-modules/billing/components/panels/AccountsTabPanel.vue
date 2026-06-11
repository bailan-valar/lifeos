<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="store.activeAccountSubTab"
        :options="store.accountSubTabOptions"
        :min-width="120"
        plain
        @change="store.activeAccountSubTab = $event"
      />
      <h4 v-else>{{ store.accountSubTabTitle }}</h4>
      <button type="button" class="add-btn" @click="openAccountDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        添加账户
      </button>
    </div>
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ store.activeAccountSubTab === 'personal' ? '净资产' : '总余额' }}</span>
          <span class="stat-value" :class="{ negative: totalNet < 0 }">{{ formatBalance(totalNet) }}</span>
        </div>
        <template v-if="store.activeAccountSubTab === 'personal'">
          <div class="stat-card">
            <span class="stat-label">总资产</span>
            <span class="stat-value positive">{{ formatBalance(totalAssets) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">总负债</span>
            <span class="stat-value negative">{{ formatBalance(totalLiabilities) }}</span>
          </div>
        </template>
        <div class="stat-card">
          <span class="stat-label">账户数量</span>
          <span class="stat-value">{{ filteredAccounts.length }} 个</span>
        </div>
      </div>
    </div>
    <div class="list-container">
      <AccountList
        :accounts="filteredAccounts"
        @edit="openAccountDialog"
        @delete="handleDeleteAccount"
        @view-statements="openStatementList"
        @adjust-balance="openBalanceAdjustDialog"
        @installment="openInstallmentDialog"
        @view-detail="navigateTo('/billing/accounts/' + $event.id)"
      />
    </div>

    <!-- 账户对话框 -->
    <AccountDialog
      v-if="accountDialogVisible"
      :visible="accountDialogVisible"
      :account="editingAccount"
      :categories="categories"
      :default-name="accountFormDefaults?.defaultName"
      :default-type="accountFormDefaults?.defaultType as AccountType | undefined"
      @confirm="handleAccountConfirm"
      @cancel="closeAccountDialog"
    />
    <BalanceAdjustDialog
      v-if="balanceAdjustVisible"
      :visible="balanceAdjustVisible"
      :account="adjustingAccount"
      :adjustments="balanceAdjustments"
      @confirm="handleBalanceAdjustConfirm"
      @cancel="closeBalanceAdjust"
      @delete-record="handleDeleteBalanceAdjustment"
    />
    <StatementDialog
      v-if="statementDialogVisible"
      :visible="statementDialogVisible"
      :statement="editingStatement"
      @confirm="handleStatementConfirm"
      @cancel="closeStatementDialog"
    />
    <StatementListDialog
      v-if="statementListDialogVisible"
      :visible="statementListDialogVisible"
      :account="viewingAccount"
      :statements="viewingAccountStatements"
      @edit="openStatementEdit"
      @generate="handleGenerateStatement"
      @close="closeStatementList"
    />
    <InstallmentDialog
      v-if="installmentDialogVisible"
      :visible="installmentDialogVisible"
      :account="installmentAccount"
      :accounts="accounts"
      @update:visible="installmentDialogVisible = $event"
      @confirm="handleInstallmentConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useStatements } from '~/composables/useStatements'
import { createBalanceAdjustment, loadBalanceAdjustments, deleteBalanceAdjustment } from '~/composables/useBalanceAdjustments'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import type { AccountFormData, Account, AccountType, StatementFormData, Statement, BalanceAdjustment, InstallmentFormData, InstallmentItem } from '~/types/bill'
import { useBills } from '~/composables/useBills'
import SelectPicker from '../SelectPicker.vue'
import AccountList from '../AccountList.vue'
import AccountDialog from '../AccountDialog.vue'
import BalanceAdjustDialog from '../BalanceAdjustDialog.vue'
import StatementDialog from '../StatementDialog.vue'
import StatementListDialog from '../StatementListDialog.vue'
import InstallmentDialog from '../InstallmentDialog.vue'

const store = useBillingStore()
const { isMobile } = useDevice()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()

const { accounts, createAccount, updateAccount, deleteAccount } = useAccounts()
const { categories } = useBillCategories()
const { statements, updateStatement, generateForPeriod } = useStatements()

// 对话框状态
const accountDialogVisible = ref(false)
const editingAccount = ref<Account | undefined>(undefined)
const accountFormDefaults = ref<{ defaultName?: string; defaultType?: string } | undefined>(undefined)

const balanceAdjustVisible = ref(false)
const adjustingAccount = ref<Account | undefined>(undefined)
const balanceAdjustments = ref<BalanceAdjustment[]>([])

const statementDialogVisible = ref(false)
const editingStatement = ref<Statement | undefined>(undefined)

const statementListDialogVisible = ref(false)
const viewingAccount = ref<Account | undefined>(undefined)

const installmentDialogVisible = ref(false)
const installmentAccount = ref<Account | null>(null)

// 计算属性
const filteredAccounts = computed(() => {
  return accounts.value.filter((a: Account) => a.type === store.activeAccountSubTab)
})

const totalNet = computed(() => {
  return filteredAccounts.value.reduce((sum: number, a: Account) => sum + a.balance, 0)
})

const totalAssets = computed(() => {
  // 仅 personal 类型：现金、储蓄卡、网络账户视为资产
  if (store.activeAccountSubTab !== 'personal') return totalNet.value
  return filteredAccounts.value.reduce((sum: number, a: Account) => {
    if (a.subtype === 'credit_card') return sum
    return sum + a.balance
  }, 0)
})

const totalLiabilities = computed(() => {
  // 仅 personal 类型：信用卡已用额度视为负债
  if (store.activeAccountSubTab !== 'personal') return 0
  return filteredAccounts.value.reduce((sum: number, a: Account) => {
    if (a.subtype === 'credit_card') {
      return sum + Math.max(0, -a.balance)
    }
    return sum
  }, 0)
})

function formatBalance(n: number) {
  const sign = n < 0 ? '-' : ''
  return sign + '¥' + Math.abs(n).toFixed(2)
}

const viewingAccountStatements = computed(() =>
  viewingAccount.value
    ? statements.value.filter((s: any) => s.accountId === viewingAccount.value!.id)
    : []
)

// 对话框操作
function openAccountDialog(account?: Account, defaults?: { defaultName?: string; defaultType?: string }) {
  editingAccount.value = account
  accountFormDefaults.value = defaults
  accountDialogVisible.value = true
}

function closeAccountDialog() {
  accountDialogVisible.value = false
  editingAccount.value = undefined
  accountFormDefaults.value = undefined
}

function openBalanceAdjustDialog(account: Account) {
  adjustingAccount.value = account
  loadBalanceAdjustHistory(account.id)
  balanceAdjustVisible.value = true
}

function closeBalanceAdjust() {
  balanceAdjustVisible.value = false
  adjustingAccount.value = undefined
  balanceAdjustments.value = []
}

function openStatementList(account: Account) {
  viewingAccount.value = account
  statementListDialogVisible.value = true
}

function closeStatementList() {
  statementListDialogVisible.value = false
  viewingAccount.value = undefined
}

function openInstallmentDialog(account: Account) {
  installmentAccount.value = account
  installmentDialogVisible.value = true
}

function openStatementEdit(statement: any) {
  editingStatement.value = statement
  statementListDialogVisible.value = false
  statementDialogVisible.value = true
}

function closeStatementDialog() {
  statementDialogVisible.value = false
  editingStatement.value = undefined
  if (viewingAccount.value) {
    statementListDialogVisible.value = true
  }
}

// 事件处理
async function handleDeleteAccount(id: string) {
  if (!await confirm('确定删除此账户？')) return
  try {
    await deleteAccount(id)
    showSuccess('账户已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleAccountConfirm(data: AccountFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateAccount(id, data)
      showSuccess('账户已更新')
    } else {
      await createAccount(data)
      showSuccess('账户已添加')
    }
    closeAccountDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBalanceAdjustConfirm(data: { date: string; balance: number; note: string }) {
  if (!adjustingAccount.value) return
  try {
    await createBalanceAdjustment(
      adjustingAccount.value.id,
      data.date,
      data.balance,
      data.note
    )
    showSuccess('余额已调整')
    await loadBalanceAdjustHistory(adjustingAccount.value.id)
    closeBalanceAdjust()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function loadBalanceAdjustHistory(accountId: string) {
  try {
    balanceAdjustments.value = await loadBalanceAdjustments(accountId)
  } catch (e) {
    console.error('Failed to load balance adjustments:', e)
  }
}

async function handleDeleteBalanceAdjustment(id: string) {
  if (!await confirm('确定删除此调整记录？')) return
  try {
    await deleteBalanceAdjustment(id)
    balanceAdjustments.value = balanceAdjustments.value.filter(a => a.id !== id)
    showSuccess('记录已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleStatementConfirm(data: StatementFormData, id: string) {
  try {
    if (data.statementAmount < 0 || data.paidAmount < 0) {
      showError('金额不能为负数')
      return
    }
    await updateStatement(id, data)
    showSuccess('对账单已更新')
    closeStatementDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleGenerateStatement(year: number, month: number) {
  if (!viewingAccount.value) return
  const existing = statements.value.find(
    (s: Statement) => s.accountId === viewingAccount.value!.id && s.year === year && s.month === month
  )
  if (existing) {
    const ok = await confirm({
      title: '重新生成',
      message: `${year}年${month}月账单周期已存在，将根据最新账单数据重新计算应还金额。已还金额和手动编辑的状态不会被覆盖。`,
      confirmText: '重新生成',
      danger: false
    })
    if (!ok) return
  }
  try {
    await generateForPeriod(viewingAccount.value, [], year, month)
    showSuccess(existing ? '账单周期已重新生成' : '账单周期已生成')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleInstallmentConfirm(data: InstallmentFormData, items: InstallmentItem[]) {
  try {
    const { createInstallmentBills } = useBills()
    await createInstallmentBills(data, items)
    showSuccess(`分期还款计划已创建，共 ${items.length} 期`)
    installmentDialogVisible.value = false
    installmentAccount.value = null
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}
</script>

<style scoped>
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
  color: rgba(60, 60, 67, 0.8);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.add-btn:hover {
  opacity: 0.9;
}

.add-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(60, 60, 67, 0.7);
}

.add-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 资产统计 */
.stats-section {
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}

.stat-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.stat-value.positive {
  color: rgb(52, 199, 89);
}

.stat-value.negative {
  color: rgb(255, 59, 48);
}
</style>
