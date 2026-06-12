<template>
  <div class="account-detail">
    <!-- 头部返回 + 操作 -->
    <div class="detail-header">
      <button type="button" class="back-btn" @click="goBack">
        <Icon name="solar:alt-arrow-left-linear" size="18" />
        <span>返回账单</span>
      </button>
      <div class="header-actions">
        <button type="button" class="action-text-btn" @click="openAccountDialog">
          <Icon name="solar:pen-linear" size="16" />
          编辑
        </button>
        <button type="button" class="add-btn" @click="openBillDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          记一笔
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="pageLoading" class="skeleton-wrapper">
      <div class="skeleton-header" />
      <div class="skeleton-stats">
        <div v-for="i in 4" :key="i" class="skeleton-stat-card" />
      </div>
    </div>

    <!-- 账户不存在 -->
    <div v-else-if="!account" class="empty-state">
      <Icon name="solar:wallet-linear" size="48" />
      <span>账户不存在或已被删除</span>
      <button type="button" class="back-btn primary" @click="goBack">
        返回账单
      </button>
    </div>

    <template v-else>
      <!-- 账户头部 -->
      <div class="account-header">
        <div class="account-icon-wrapper" :style="{ background: account.color ? `${account.color}20` : 'rgba(0,122,255,0.1)' }">
          <Icon :name="account.icon || 'solar:wallet-linear'" size="28" :style="{ color: account.color || 'rgb(0,122,255)' }" />
        </div>
        <div class="account-meta">
          <div class="account-name-row">
            <h2 class="account-title">{{ account.name }}</h2>
            <span class="type-tag" :class="badgeClass(account)">{{ badgeLabel(account) }}</span>
          </div>
          <div class="account-balance-row">
            <span class="balance-label">余额</span>
            <span class="balance-value" :class="{ negative: account.balance < 0 }">
              {{ formatBalance(account.balance) }} {{ account.currency }}
            </span>
          </div>
        </div>
      </div>

      <!-- 信用卡额外信息 -->
      <div v-if="isCreditCard(account)" class="credit-info">
        <div class="credit-card">
          <span class="credit-label">信用额度</span>
          <span class="credit-value">{{ formatBalance(account.creditLimit ?? 0) }} {{ account.currency }}</span>
        </div>
        <div class="credit-card">
          <span class="credit-label">已用额度</span>
          <span class="credit-value" :class="{ negative: account.balance < 0 }">
            {{ formatBalance(Math.max(0, -account.balance)) }} {{ account.currency }}
          </span>
        </div>
        <div class="credit-card">
          <span class="credit-label">可用额度</span>
          <span class="credit-value">
            {{ formatBalance((account.creditLimit ?? 0) - Math.max(0, -account.balance)) }} {{ account.currency }}
          </span>
        </div>
        <div class="credit-card">
          <span class="credit-label">账单日</span>
          <span class="credit-value">每月 {{ account.billingDay ?? 1 }} 日</span>
        </div>
        <div class="credit-card">
          <span class="credit-label">还款日</span>
          <span class="credit-value">每月 {{ account.repaymentDay ?? 1 }} 日</span>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">账单数量</span>
          <span class="stat-value">{{ filteredBills.length }} 笔</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">总收入</span>
          <span class="stat-value positive">+{{ totalIncome.toFixed(2) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">总支出</span>
          <span class="stat-value negative">-{{ totalExpense.toFixed(2) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">月均</span>
          <span class="stat-value" :class="monthlyAverage >= 0 ? 'positive' : 'negative'">
            {{ monthlyAverage >= 0 ? '+' : '-' }}{{ Math.abs(monthlyAverage).toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- 筛选工具栏 -->
      <div class="filter-bar">
        <div class="filter-group">
          <select v-model="yearFilter" class="filter-select" @change="onFilterChange">
            <option :value="null">全部年份</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select v-model="monthFilter" class="filter-select" @change="onFilterChange">
            <option :value="null">全部月份</option>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
        </div>
        <span class="filter-result">共 {{ filteredBills.length }} 笔{{ filteredAdjustments.length > 0 ? ` · ${filteredAdjustments.length} 次调整` : '' }}</span>
      </div>

      <!-- 账单列表 -->
      <div class="list-wrapper">
        <BillList
          :bills="filteredBills"
          :adjustments="filteredAdjustments"
          :account-id="accountId"
          :current-balance="account?.balance"
          :show-running-balance="true"
          @edit="openBillDialog"
          @delete="handleDeleteBill"
          @contextmenu="openBillContextMenu"
        />
      </div>
    </template>

    <!-- 编辑/新建账单弹框 -->
    <BillDialog
      v-if="billDialogVisible"
      :visible="billDialogVisible"
      :bill="editingBill || undefined"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :default-form-values="{ fromAccountId: account?.id }"
      @confirm="onBillDialogConfirm"
      @cancel="billDialogVisible = false; editingBill = null"
    />

    <!-- 编辑账户弹框 -->
    <AccountDialog
      v-if="accountDialogVisible"
      :visible="accountDialogVisible"
      :account="account || undefined"
      :categories="categories"
      @confirm="onAccountDialogConfirm"
      @cancel="accountDialogVisible = false"
    />

    <!-- 右键菜单 -->
    <BillContextMenu
      v-model:visible="ctxMenuVisible"
      :bill="ctxMenuBill"
      :x="ctxMenuX"
      :y="ctxMenuY"
      @reposition="ctxMenuX = $event; ctxMenuY = $event"
      @copy="handleCopyBill"
      @edit="openBillDialog"
      @split="handleSplitBill"
      @allocate="handleAllocateBill"
      @refund="handleRefundBill"
      @delete="handleContextMenuDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Account, Bill, BillCategory, BillFormData, BalanceAdjustment } from '~/types/bill'
import { toLocalISO } from '~/services/db'
import { sum, sub, div } from '~/utils/decimal'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import { loadBalanceAdjustments } from '~/composables/useBalanceAdjustments'
import BillList from './BillList.vue'
import BillDialog from './BillDialog.vue'
import AccountDialog from './AccountDialog.vue'
import BillContextMenu from './BillContextMenu.vue'

const props = defineProps<{
  accountId: string
}>()

const fab = useGlobalFab()

onMounted(() => {
  fab.register('billing-account', () => openBillDialog())
})

// 路由与状态
const router = useRouter()

// 数据 store
const { accounts, loadAccounts, updateAccount } = useAccounts()
const { bills, loadBillsByAccount, createBill, updateBill, deleteBill, splitBill, allocatePeriod, createRefundBill } = useBills()
const { categories, loadCategories } = useBillCategories()
const { loadNotes, noteOptions } = useNotes()

// 笔记数据延迟加载标记（仅在打开账单弹框时加载）
const notesLoaded = ref(false)

const pageLoading = ref(true)
const adjustments = ref<BalanceAdjustment[]>([])
const editingBill = ref<Bill | null>(null)
const billDialogVisible = ref(false)
const accountDialogVisible = ref(false)

// 右键菜单状态
const ctxMenuVisible = ref(false)
const ctxMenuBill = ref<Bill | null>(null)
const ctxMenuX = ref(0)
const ctxMenuY = ref(0)

// 筛选
const yearFilter = ref<number | null>(null)
const monthFilter = ref<number | null>(null)

const yearOptions = computed(() => {
  const years = new Set<number>()
  for (const b of bills.value) {
    const y = new Date(b.date).getFullYear()
    years.add(y)
  }
  return Array.from(years).sort((a, b) => b - a)
})

// 当前账户
const account = computed(() =>
  accounts.value.find(a => a.id === props.accountId)
)

// 过滤后的账单
const filteredBills = computed(() => {
  let list = bills.value
  if (yearFilter.value !== null) {
    list = list.filter(b => new Date(b.date).getFullYear() === yearFilter.value)
  }
  if (monthFilter.value !== null) {
    list = list.filter(b => new Date(b.date).getMonth() + 1 === monthFilter.value)
  }
  return list
})

// 过滤后的余额调整
const filteredAdjustments = computed(() => {
  let list = adjustments.value
  if (yearFilter.value !== null) {
    list = list.filter(a => new Date(a.date).getFullYear() === yearFilter.value)
  }
  if (monthFilter.value !== null) {
    list = list.filter(a => new Date(a.date).getMonth() + 1 === monthFilter.value)
  }
  return list
})

// 统计
const totalIncome = computed(() =>
  sum(filteredBills.value
    .filter(b => b.toAccountId === props.accountId && (b.type === 'income' || b.type === 'transfer') && b.status === 'completed')
    .map(b => b.amount))
)

const totalExpense = computed(() =>
  sum(filteredBills.value
    .filter(b => b.fromAccountId === props.accountId && (b.type === 'expense' || b.type === 'transfer') && b.status === 'completed')
    .map(b => b.amount))
)

const monthlyAverage = computed(() => {
  const count = filteredBills.value.length
  if (count === 0) return 0
  const net = sub(totalIncome.value, totalExpense.value)
  if (yearFilter.value !== null && monthFilter.value === null) {
    return div(net, 12)
  }
  if (monthFilter.value !== null) {
    return net
  }
  const months = new Set(filteredBills.value.map(b => b.date.slice(0, 7)))
  return months.size > 0 ? div(net, months.size) : 0
})

// 加载数据
async function loadData() {
  pageLoading.value = true
  // 所有数据并行加载，无需串行等待
  await Promise.all([
    loadAccounts(),
    loadCategories(),
    loadBillsByAccount(props.accountId),
    loadBalanceAdjustments(props.accountId).then(result => { adjustments.value = result })
  ])
  pageLoading.value = false
}

async function refreshBills() {
  await Promise.all([
    loadBillsByAccount(props.accountId),
    loadBalanceAdjustments(props.accountId).then(result => { adjustments.value = result })
  ])
}

function onFilterChange() {
  // 筛选由客户端 computed 处理，无需重新加载
}

const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()

// 右键菜单处理
function openBillContextMenu(payload: { bill: Bill; x: number; y: number }) {
  ctxMenuBill.value = payload.bill
  ctxMenuX.value = payload.x
  ctxMenuY.value = payload.y
  ctxMenuVisible.value = true
}

async function handleCopyBill(bill: Bill) {
  try {
    const formData: BillFormData = {
      noteId: bill.noteId,
      type: bill.type,
      amount: bill.amount,
      currency: bill.currency,
      fromAccountId: bill.fromAccountId,
      toAccountId: bill.toAccountId,
      categoryId: bill.categoryId,
      description: bill.description ? `${bill.description} (复制)` : '(复制)',
      date: toLocalISO(),
      debtSubtype: bill.debtSubtype || 'lend',
      relatedPersonId: bill.relatedPersonId
    }
    await createBill(formData)
    showSuccess('账单已复制')
    await refreshBills()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleSplitBill(bill: Bill) {
  // 复用 BillDialog 的拆分流程
  openBillDialog(bill)
}

async function handleAllocateBill(bill: Bill) {
  openBillDialog(bill)
}

async function handleRefundBill(bill: Bill) {
  openBillDialog(bill)
}

async function handleContextMenuDelete(bill: Bill) {
  const ok = await confirm({
    title: '删除账单',
    message: '确定要删除这条账单吗？此操作不可恢复。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  await deleteBill(bill.id)
  await refreshBills()
  await loadAccounts()
}

function goBack() {
  router.push('/billing')
}

function openBillDialog(bill?: Bill) {
  editingBill.value = bill ?? null
  billDialogVisible.value = true
  // 笔记数据延迟加载：仅在首次打开弹框时加载
  if (!notesLoaded.value) {
    notesLoaded.value = true
    loadNotes()
  }
}

async function onBillDialogConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
    } else {
      await createBill(data)
    }
    billDialogVisible.value = false
    editingBill.value = null
    await refreshBills()
    await loadAccounts()
  } catch (e) {
    console.error('Failed to save bill:', e)
  }
}

async function handleDeleteBill(id: string) {
  const ok = await useConfirm().confirm({
    title: '删除账单',
    message: '确定要删除这条账单吗？此操作不可恢复。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  await deleteBill(id)
  await refreshBills()
  await loadAccounts()
}

function openAccountDialog() {
  accountDialogVisible.value = true
}

async function onAccountDialogConfirm(data: any, isEditing: boolean, id?: string) {
  if (isEditing && id) {
    await updateAccount(id, data)
  }
  accountDialogVisible.value = false
  await loadAccounts()
}

// 辅助函数
function isCreditCard(a: Account): boolean {
  return a.type === 'personal' && a.subtype === 'credit_card'
}

function badgeLabel(a: Account): string {
  if (a.type === 'merchant') return '商户'
  if (a.type === 'contact') return '联系人'
  if (a.type === 'other') return '其他'
  if (a.subtype === 'debit_card') return '储蓄卡'
  if (a.subtype === 'credit_card') return '信用卡'
  if (a.subtype === 'online_account') return '网络账户'
  return '现金'
}

function badgeClass(a: Account): string {
  if (a.type === 'merchant') return 'merchant'
  if (a.type === 'contact') return 'contact'
  if (a.type === 'other') return 'other'
  if (a.subtype === 'credit_card') return 'credit'
  if (a.subtype === 'debit_card') return 'debit'
  if (a.subtype === 'online_account') return 'online'
  return 'personal'
}

function formatBalance(n: number) {
  return n.toFixed(2)
}

onMounted(() => {
  loadData()
})

watch(() => props.accountId, () => {
  yearFilter.value = null
  monthFilter.value = null
  loadData()
})
</script>

<style scoped>
.account-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: auto;
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}
.back-btn.primary {
  background: rgb(0, 122, 255);
  color: white;
  border-color: transparent;
}

.action-text-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.action-text-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.add-btn:hover {
  background: rgb(0, 102, 230);
}

/* 骨架屏 */
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-header {
  height: 80px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.skeleton-stat-card {
  height: 80px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 16px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 14px;
}

/* 账户头部 */
.account-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.account-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  flex-shrink: 0;
}
.account-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.account-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.account-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  margin: 0;
}
.type-tag {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.type-tag.personal {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.type-tag.debit {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.type-tag.credit {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.type-tag.online {
  background: rgba(90, 200, 250, 0.12);
  color: rgb(0, 122, 255);
}
.type-tag.merchant {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}
.type-tag.contact {
  background: rgba(88, 86, 214, 0.1);
  color: rgb(88, 86, 214);
}
.type-tag.other {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}
.account-balance-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.balance-label {
  color: rgba(60, 60, 67, 0.55);
}
.balance-value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}
.balance-value.negative {
  color: rgb(255, 59, 48);
}

/* 信用卡信息 */
.credit-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.credit-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.credit-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}
.credit-value {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}
.credit-value.negative {
  color: rgb(255, 59, 48);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.stat-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}
.stat-value.positive {
  color: rgb(52, 199, 89);
}
.stat-value.negative {
  color: rgb(255, 59, 48);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.filter-group {
  display: flex;
  gap: 8px;
}
.filter-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  cursor: pointer;
  outline: none;
}
.filter-select:focus {
  border-color: rgba(0, 122, 255, 0.4);
}
.filter-result {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.5);
}

/* 列表区域 */
.list-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
