<template>
  <div class="category-detail">
    <!-- 头部返回 + 操作 -->
    <div class="detail-header">
      <button type="button" class="back-btn" @click="goBack">
        <Icon name="solar:alt-arrow-left-linear" size="18" />
        <span>返回账单</span>
      </button>
      <button type="button" class="add-btn" @click="openBillDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        记一笔
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="pageLoading" class="skeleton-wrapper">
      <div class="skeleton-header" />
      <div class="skeleton-stats">
        <div v-for="i in 4" :key="i" class="skeleton-stat-card" />
      </div>
    </div>

    <!-- 分类不存在 -->
    <div v-else-if="!category" class="empty-state">
      <Icon name="solar:folder-error-linear" size="48" />
      <span>分类不存在或已被删除</span>
      <button type="button" class="back-btn primary" @click="goBack">
        返回账单
      </button>
    </div>

    <template v-else>
      <!-- 分类头部 -->
      <div class="category-header">
        <div class="category-icon-wrapper" :style="{ background: category.color ? `${category.color}20` : 'rgba(0,122,255,0.1)' }">
          <Icon :name="category.icon || 'solar:folder-linear'" size="28" :style="{ color: category.color || 'rgb(0,122,255)' }" />
        </div>
        <div class="category-meta">
          <div class="category-name-row">
            <h2 class="category-title">{{ category.name }}</h2>
            <span class="type-tag" :class="category.type">{{ category.type === 'income' ? '收入' : '支出' }}</span>
          </div>
          <div v-if="breadcrumb.length > 0" class="breadcrumb">
            <span
              v-for="(item, idx) in breadcrumb"
              :key="item.id"
              class="breadcrumb-item"
              @click="navigateToCategory(item.id)"
            >
              {{ item.name }}
              <span v-if="idx < breadcrumb.length - 1" class="breadcrumb-sep">/</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">账单数量</span>
          <span class="stat-value">{{ filteredBills.length }} 笔</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ category.type === 'income' ? '总收入' : '总支出' }}</span>
          <span class="stat-value" :class="category.type === 'income' ? 'positive' : 'negative'">
            {{ category.type === 'income' ? '+' : '-' }}{{ totalAmount.toFixed(2) }}
          </span>
        </div>
        <div class="stat-card">
          <span class="stat-label">月均</span>
          <span class="stat-value" :class="category.type === 'income' ? 'positive' : 'negative'">
            {{ category.type === 'income' ? '+' : '-' }}{{ monthlyAverage.toFixed(2) }}
          </span>
        </div>
        <div v-if="budgetUsage !== null" class="stat-card">
          <span class="stat-label">预算使用</span>
          <span class="stat-value" :class="budgetUsage > 100 ? 'negative' : 'positive'">
            {{ budgetUsage.toFixed(0) }}%
          </span>
        </div>
      </div>

      <!-- 子分类 -->
      <div v-if="children.length > 0" class="children-section">
        <span class="section-label">子分类</span>
        <div class="children-tags">
          <span
            v-for="child in children"
            :key="child.id"
            class="child-tag"
            @click="navigateToCategory(child.id)"
          >
            <Icon :name="child.icon || 'solar:folder-linear'" size="14" />
            {{ child.name }}
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
        <span class="filter-result">共 {{ filteredBills.length }} 笔</span>
      </div>

      <!-- 账单列表 -->
      <div class="list-wrapper">
        <BillList
          :bills="filteredBills"
          @edit="openBillDialog"
          @delete="handleDeleteBill"
          @contextmenu="openBillContextMenu"
        />
      </div>
    </template>

    <!-- 编辑/新建弹框 -->
    <BillDialog
      v-if="billDialogVisible"
      :visible="billDialogVisible"
      :bill="editingBill || undefined"
      :accounts="accounts"
      :categories="allCategories"
      :note-options="noteOptions"
      :default-form-values="{ categoryId: categoryId }"
      @confirm="onBillDialogConfirm"
      @cancel="billDialogVisible = false; editingBill = null"
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
      @split="openBillDialog"
      @allocate="openBillDialog"
      @refund="openBillDialog"
      @delete="handleContextMenuDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillCategory, BillFormData } from '~/types/bill'
import { sum, div, mul } from '~/utils/decimal'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import BillList from './BillList.vue'
import BillDialog from './BillDialog.vue'
import BillContextMenu from './BillContextMenu.vue'

const props = defineProps<{
  categoryId: string
}>()

const fab = useGlobalFab()

onMounted(() => {
  fab.register('billing-category', () => openBillDialog())
})

// 路由与状态
const router = useRouter()

// 数据 store
const { categories, loadCategories, buildTree } = useBillCategories()
const { bills, loadBillsByCategory, createBill, deleteBill } = useBills()
const { accounts, loadAccounts } = useAccounts()
const { budgets, loadBudgets, resolveBudget, getMonthlyEquivalent } = useBudgets()
const { loadNotes, noteOptions } = useNotes()

const pageLoading = ref(true)
const editingBill = ref<Bill | null>(null)
const billDialogVisible = ref(false)

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

// 当前分类
const category = computed(() =>
  categories.value.find(c => c.id === props.categoryId)
)

// 面包屑路径
const breadcrumb = computed(() => {
  const result: BillCategory[] = []
  let current = category.value
  while (current?.parentId) {
    const parent = categories.value.find(c => c.id === current!.parentId)
    if (!parent) break
    result.unshift(parent)
    current = parent
  }
  return result
})

// 子分类
const children = computed(() =>
  categories.value.filter(c => c.parentId === props.categoryId)
)

// 全部分类（用于 BillDialog）
const allCategories = computed(() => categories.value)

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

// 统计
const totalAmount = computed(() =>
  sum(filteredBills.value
    .filter(b => b.type === category.value?.type && b.status === 'completed')
    .map(b => b.amount))
)

const monthlyAverage = computed(() => {
  const count = filteredBills.value.length
  if (count === 0) return 0
  // 如果按年筛选，月均 = 总金额 / 12；如果按月筛选，月均 = 总金额；否则按有账单月份数平均
  if (yearFilter.value !== null && monthFilter.value === null) {
    return div(totalAmount.value, 12)
  }
  if (monthFilter.value !== null) {
    return totalAmount.value
  }
  // 计算有账单的独立月份数
  const months = new Set(filteredBills.value.map(b => b.date.slice(0, 7)))
  return months.size > 0 ? div(totalAmount.value, months.size) : 0
})

const budgetUsage = computed(() => {
  if (!category.value || category.value.type !== 'expense') return null
  const now = new Date()
  const year = yearFilter.value ?? now.getFullYear()
  const month = monthFilter.value ?? now.getMonth() + 1
  const monthlyBudget = getMonthlyEquivalent(category.value.id, year, month)
  if (monthlyBudget <= 0) return null
  const actual = sum(filteredBills.value
    .filter(b => b.type === 'expense' && b.status === 'completed')
    .map(b => b.amount))
  return mul(div(actual, monthlyBudget), 100)
})

// 加载数据
async function loadData() {
  pageLoading.value = true
  await Promise.all([
    loadCategories(),
    loadAccounts(),
    loadBudgets(),
    loadNotes()
  ])
  await refreshBills()
  pageLoading.value = false
}

async function refreshBills() {
  let startDate: string | undefined
  let endDate: string | undefined
  if (yearFilter.value !== null) {
    if (monthFilter.value !== null) {
      const m = String(monthFilter.value).padStart(2, '0')
      startDate = `${yearFilter.value}-${m}-01`
      const lastDay = new Date(yearFilter.value, monthFilter.value, 0).getDate()
      endDate = `${yearFilter.value}-${m}-${String(lastDay).padStart(2, '0')}`
    } else {
      startDate = `${yearFilter.value}-01-01`
      endDate = `${yearFilter.value}-12-31`
    }
  }
  await loadBillsByCategory(props.categoryId, undefined, startDate, endDate)
}

function onFilterChange() {
  refreshBills()
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
      date: new Date().toISOString().slice(0, 16),
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
}

function goBack() {
  router.push('/billing')
}

function navigateToCategory(id: string) {
  router.push(`/billing/categories/${id}`)
}

function openBillDialog(bill?: Bill) {
  editingBill.value = bill ?? null
  billDialogVisible.value = true
}

async function onBillDialogConfirm() {
  billDialogVisible.value = false
  editingBill.value = null
  await refreshBills()
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
}

onMounted(() => {
  loadData()
})

watch(() => props.categoryId, () => {
  yearFilter.value = null
  monthFilter.value = null
  loadData()
})
</script>

<style scoped>
.category-detail {
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

/* 分类头部 */
.category-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.category-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  flex-shrink: 0;
}
.category-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.category-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.category-title {
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
.type-tag.income {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.type-tag.expense {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}
.breadcrumb-item {
  cursor: pointer;
  transition: color 0.15s ease;
}
.breadcrumb-item:hover {
  color: rgb(0, 122, 255);
}
.breadcrumb-sep {
  margin: 0 4px;
  color: rgba(60, 60, 67, 0.3);
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

/* 子分类 */
.children-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
}
.children-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.child-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}
.child-tag:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
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
