<template>
  <Teleport to="body">
    <BaseDialog
      :visible="visible"
      :title="title"
      size="medium"
      @close="onCancel"
    >
      <div v-if="loading" class="loading">
        <span>加载中...</span>
      </div>
      <div v-else-if="bills.length === 0" class="empty">
        <Icon :name="SOLAR_ICONS.doc.default" size="32" />
        <span>暂无支出记录</span>
      </div>
      <div v-else class="bills-list">
        <BillListItem
          v-for="bill in bills"
          :key="bill.id"
          :bill="bill"
          :all-bills="bills"
          :category-name="getCategoryName(bill)"
          :account-name="getAccountName(bill)"
          :show-actions="true"
          @click="viewBill(bill)"
          @edit="openEditDialog(bill)"
          @delete="handleDelete(bill)"
          @split="handleSplit(bill)"
          @allocate="handleAllocate(bill)"
          @refund="handleRefund(bill)"
        />
        <div class="summary-section">
          <div class="summary-group">
            <div class="summary-label">年预算</div>
            <div class="summary-value">{{ formatAmount(yearlyBudget) }}</div>
          </div>
          <div class="summary-group">
            <div class="summary-label">年执行</div>
            <div class="summary-value summary-value-expense">-{{ formatAmount(yearlyExecution) }}</div>
          </div>
          <div class="summary-group">
            <div class="summary-label">月预算</div>
            <div class="summary-value">{{ formatAmount(monthlyBudget) }}</div>
          </div>
          <div class="summary-group">
            <div class="summary-label">月执行</div>
            <div class="summary-value summary-value-expense">-{{ formatAmount(monthlyExecution) }}</div>
          </div>
        </div>
      </div>
    </BaseDialog>

    <BillDialog
      v-if="billDialogVisible"
      :visible="billDialogVisible"
      :bill="editingBill"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      @update:visible="billDialogVisible = $event"
      @confirm="handleBillConfirm"
      @cancel="billDialogVisible = false"
      @action-completed="loadBillsData"
    />

    <!-- 拆分对话框 -->
    <BillSplitDialog
      v-if="splitDialogVisible && selectedBill"
      :visible="splitDialogVisible"
      :bill="selectedBill"
      :categories="categories"
      @update:visible="onSplitDialogVisibleChange"
      @confirm="handleSplitConfirm"
    />

    <!-- 分摊对话框 -->
    <BillAllocateDialog
      v-if="allocateDialogVisible && selectedBill"
      :visible="allocateDialogVisible"
      :bill="selectedBill"
      @update:visible="onAllocateDialogVisibleChange"
      @confirm="handleAllocateConfirm"
    />

    <!-- 退款对话框 -->
    <BillRefundDialog
      v-if="refundDialogVisible && selectedBill"
      :visible="refundDialogVisible"
      :bill="selectedBill"
      :accounts="accounts"
      @update:visible="onRefundDialogVisibleChange"
      @confirm="handleRefundConfirm"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { Bill, BillCategory, BillFormData } from '~/types/bill'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import BillListItem from './BillListItem.vue'
import BillDialog from './BillDialog.vue'
import BillSplitDialog from './BillSplitDialog.vue'
import BillAllocateDialog from './BillAllocateDialog.vue'
import BillRefundDialog from './BillRefundDialog.vue'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useBills } from '~/composables/useBills'
import { useBudgets } from '~/composables/useBudgets'
import { useNotes } from '~/composables/useNotes'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'

const props = defineProps<{
  visible: boolean
  categoryId: string
  categoryName: string
  year: number
  month: number
  noteId?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  cancel: []
}>()

const { loadBills, updateBill, deleteBill, splitBill, allocatePeriod, createRefund } = useBills()
const { getDescendantNoteIds } = useNotes()
const { noteOptions } = useNotes()
const { accounts } = useAccounts()
const { categories, buildTree } = useBillCategories()
const { resolveBudget, resolveYear, getMonthlyEquivalent } = useBudgets()
const { success: showSuccess, error: showError, warning: showWarning } = useToast()
const { confirm } = useConfirm()

/**
 * 获取分类及其所有子分类的 ID
 */
function getCategoryAndChildIds(categoryId: string): string[] {
  const ids = [categoryId]

  // 递归收集子分类 ID
  function collectChildren(node: any, targetId: string) {
    if (node.id === targetId) {
      // 找到目标节点，收集所有子孙节点
      function collectAllChildren(n: any) {
        ids.push(n.id)
        for (const child of n.children) {
          collectAllChildren(child)
        }
      }
      collectAllChildren(node)
      return true
    }
    for (const child of node.children) {
      if (collectChildren(child, targetId)) {
        return true
      }
    }
    return false
  }

  const tree = buildTree('expense')
  for (const rootNode of tree) {
    if (collectChildren(rootNode, categoryId)) {
      break
    }
  }

  return ids
}

// 账单编辑弹框状态
const billDialogVisible = ref(false)
const editingBill = ref<Bill | undefined>(undefined)

// 拆分、分摊、退款弹框状态
const splitDialogVisible = ref(false)
const allocateDialogVisible = ref(false)
const refundDialogVisible = ref(false)
const selectedBill = ref<Bill | undefined>(undefined)

const accountMap = computed(() =>
  Object.fromEntries(accounts.value.map(a => [a.id, a]))
)

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c]))
)

function getAccountName(bill: Bill) {
  const accountId = bill.fromAccountId
  return accountMap.value[accountId]?.name || ''
}

function getCategoryName(bill: Bill) {
  return categoryMap.value[bill.categoryId]?.name || ''
}

const bills = ref<Bill[]>([])
const loading = ref(false)

const title = computed(() => {
  return `${props.categoryName} - ${props.year}年${props.month}月支出`
})

const totalAmount = computed(() => {
  return bills.value.reduce((sum, bill) => sum + bill.amount, 0)
})

// 计算所有该分类的账单（用于统计年度支出）
const allCategoryBills = ref<Bill[]>([])

// 月预算
const monthlyBudget = computed(() => {
  return getMonthlyEquivalent(props.categoryId, props.year, props.month, props.noteId)
})

// 年预算：根据年度配置计算
const yearlyBudget = computed(() => {
  const yearConfigs = resolveYear(props.categoryId, props.year, props.noteId)
  let total = 0

  for (const config of yearConfigs) {
    if (!config) continue
    // 如果是年度预算，直接使用；如果是月度预算，累加
    if (config.cycleType === 'yearly') {
      total = config.amount
      break // 年度预算只有一个，找到后即可退出
    } else {
      total += config.amount
    }
  }

  return total
})

// 月执行：当前月的支出（已有 totalAmount）
const monthlyExecution = computed(() => totalAmount.value)

// 年执行：从1月到当前月的累计支出
const yearlyExecution = computed(() => {
  const monthPrefix = `${props.year}-${String(props.month).padStart(2, '0')}`
  return allCategoryBills.value
    .filter(bill => {
      // 筛选从1月到当前月的账单
      const billMonth = bill.allocatedMonth || bill.date.substring(0, 7)
      return billMonth <= monthPrefix
    })
    .reduce((sum, bill) => sum + bill.amount, 0)
})

function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

async function loadBillsData() {
  console.log('loadBillsData called, props:', props)
  loading.value = true
  try {
    await loadBills()
    const db = await (async () => {
      const { getDB } = await import('~/services/db')
      return getDB()
    })()

    const monthPrefix = `${props.year}-${String(props.month).padStart(2, '0')}`
    const yearPrefix = `${props.year}`

    // 获取分类及其所有子分类的 ID
    const categoryIds = getCategoryAndChildIds(props.categoryId)
    console.log('Category and child IDs:', categoryIds)

    let selector: Record<string, unknown> = {
      categoryId: { $in: categoryIds },
      type: 'expense'
    }

    // 处理笔记筛选：只有当 noteId 有值时才添加筛选条件
    if (props.noteId && props.noteId.trim()) {
      const noteIds = getDescendantNoteIds(props.noteId)
      selector.noteId = noteIds.length === 1 ? noteIds[0] : { $in: noteIds }
    }

    console.log('CategoryMonthBillsDialog selector:', selector)

    const result = await (await db).bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()

    const allBills = result.map((doc: any) => doc.toJSON())
    console.log('All bills for category and children:', allBills.length, allBills)

    // 保存所有该分类的账单（用于年度统计）
    allCategoryBills.value = allBills.filter((bill: Bill) => {
      // 筛选该年度的账单
      const billYear = (bill.allocatedMonth || bill.date).substring(0, 4)
      return billYear === yearPrefix
    })

    // 筛选指定月份的账单
    bills.value = allBills.filter((bill: Bill) => {
      // 如果有分摊月份，按分摊月份统计
      if (bill.allocatedMonth) {
        return bill.allocatedMonth === monthPrefix
      }
      // 否则按账单日期统计
      return bill.date.startsWith(monthPrefix)
    })

    console.log('Filtered bills for month:', monthPrefix, bills.value.length, bills.value)
  } catch (e) {
    console.error('Failed to load bills:', e)
    bills.value = []
    allCategoryBills.value = []
  } finally {
    loading.value = false
  }
}

function viewBill(bill: Bill) {
  // 点击账单项打开编辑对话框
  openEditDialog(bill)
}

function openEditDialog(bill: Bill) {
  editingBill.value = bill
  billDialogVisible.value = true
}

async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
      showSuccess('账单已更新')
      // 重新加载数据
      await loadBillsData()
    }
    billDialogVisible.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleSplit(bill: Bill) {
  selectedBill.value = bill
  splitDialogVisible.value = true
}

function handleAllocate(bill: Bill) {
  selectedBill.value = bill
  allocateDialogVisible.value = true
}

function handleRefund(bill: Bill) {
  selectedBill.value = bill
  refundDialogVisible.value = true
}

function onSplitDialogVisibleChange(visible: boolean) {
  splitDialogVisible.value = visible
  if (!visible) {
    selectedBill.value = undefined
  }
}

function onAllocateDialogVisibleChange(visible: boolean) {
  allocateDialogVisible.value = visible
  if (!visible) {
    selectedBill.value = undefined
  }
}

function onRefundDialogVisibleChange(visible: boolean) {
  refundDialogVisible.value = visible
  if (!visible) {
    selectedBill.value = undefined
  }
}

async function handleSplitConfirm(splitItems: any[]) {
  if (!selectedBill.value) return
  try {
    await splitBill(selectedBill.value.id, splitItems)
    showSuccess('账单已拆分')
    splitDialogVisible.value = false
    selectedBill.value = undefined
    await loadBillsData()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleAllocateConfirm(allocateItems: any[]) {
  if (!selectedBill.value) return
  try {
    await allocatePeriod(selectedBill.value.id, allocateItems)
    showSuccess('账单已分摊')
    allocateDialogVisible.value = false
    selectedBill.value = undefined
    await loadBillsData()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRefundConfirm(refundData: any) {
  if (!selectedBill.value) return
  try {
    await createRefund(refundData)
    showSuccess('退款已创建')
    refundDialogVisible.value = false
    selectedBill.value = undefined
    await loadBillsData()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleDelete(bill: Bill) {
  const ok = await confirm({
    message: `确定要删除这笔账单吗？`,
    danger: true
  })
  if (!ok) return

  try {
    await deleteBill(bill.id)
    showSuccess('账单已删除')
    // 重新加载数据
    await loadBillsData()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

watch(() => props.visible, (v) => {
  if (v) {
    loadBillsData()
  }
}, { immediate: true })
</script>

<style scoped>
.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  color: var(--liquid-text-secondary);
  font-size: 14px;
}

.bills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(60vh - 80px);
  overflow-y: auto;
  padding: 4px;
  padding-bottom: 8px;
}

.summary-section {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px 12px;
  margin-top: 8px;
  border-top: var(--liquid-border);
  background: var(--liquid-bg-thick);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  z-index: 10;
}

.summary-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  text-align: center;
}

.summary-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--liquid-text-secondary);
}

.summary-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.summary-value-expense {
  color: rgb(239, 68, 68);
}
</style>
