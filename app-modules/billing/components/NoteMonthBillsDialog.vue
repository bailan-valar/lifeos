<template>
  <Teleport to="body">
    <BaseDialog
      v-model:visible="dialogVisible"
      :title="`${displayNoteName} - ${year}年${month}月账单`"
      size="medium"
    >
      <div v-if="loading" class="loading">
        <span>加载中...</span>
      </div>

      <div v-else-if="bills.length === 0" class="empty">
        <Icon :name="SOLAR_ICONS.doc.default" size="32" />
        <span>该月份暂无账单</span>
      </div>

      <div v-else class="bills-list">
        <BillListItem
          v-for="bill in bills"
          :key="bill.id"
          :bill="bill"
          :all-bills="bills"
          :category-name="getCategoryName(bill.categoryId)"
          :account-name="getAccountName(bill)"
          :note-tag="bill.noteTag"
          :show-actions="true"
          @click="openEditDialog(bill)"
          @edit="openEditDialog(bill)"
          @delete="handleDelete(bill)"
          @split="handleSplit(bill)"
          @allocate="handleAllocate(bill)"
          @refund="handleRefund(bill)"
        />
        <div class="summary-row">
          <span>合计</span>
          <span class="summary-amount" :class="{ expense: totalAmount < 0, income: totalAmount >= 0 }">
            {{ totalAmount >= 0 ? '+' : '' }}¥{{ totalAmount.toFixed(2) }}
          </span>
        </div>
      </div>

      <template #footer>
        <button class="liquid-glass-button" @click="dialogVisible = false">关闭</button>
      </template>
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
      @action-completed="loadBills"
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
import type { Bill, BillFormData } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'
import { useBills } from '~/composables/useBills'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import BillListItem from './BillListItem.vue'
import BillDialog from './BillDialog.vue'
import BillSplitDialog from './BillSplitDialog.vue'
import BillAllocateDialog from './BillAllocateDialog.vue'
import BillRefundDialog from './BillRefundDialog.vue'

interface BillWithNoteTag extends Bill {
  noteTag?: string
}

const props = defineProps<{
  visible: boolean
  noteId: string
  noteName: string
  year: number
  month: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { categories } = useBillCategories()
const { accounts } = useAccounts()
const { updateBill, deleteBill, splitBill, allocatePeriod, createRefund } = useBills()
const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const { getDescendantNoteIds, notes, noteOptions } = useNotes()

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
  const accountId = bill.type === 'income' || (bill.type === 'debt' && bill.debtSubtype === 'borrow')
    ? bill.toAccountId
    : bill.fromAccountId
  return accountMap.value[accountId]?.name || ''
}

function getCategoryName(categoryId: string): string {
  return categoryMap.value[categoryId]?.name || ''
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const loading = ref(false)
const bills = ref<BillWithNoteTag[]>([])

const totalAmount = computed(() => {
  return bills.value.reduce((sum, bill) => {
    return sum + (bill.type === 'expense' ? -bill.amount : bill.amount)
  }, 0)
})

const displayNoteName = computed(() => {
  return props.noteId === '__none__' ? '无关联' : props.noteName
})

function getNoteNameById(noteId: string): string {
  if (!noteId) return ''
  const note = notes.value.find(n => n.id === noteId)
  return note?.title || ''
}

async function loadBills() {
  loading.value = true
  try {
    const prefix = `${props.year}-${String(props.month).padStart(2, '0')}`
    const { getDB } = await import('~/services/db')
    const db = await getDB()

    const isUnlinked = props.noteId === '__none__'

    // 获取当前笔记及所有后代笔记 ID，确保弹框显示内容与 Dashboard 聚合值一致
    const queryNoteIds = isUnlinked ? [] : getDescendantNoteIds(props.noteId)

    // 构建数据库查询条件
    const selector: Record<string, unknown> = {
      date: { $gte: `${prefix}-01`, $lte: `${prefix}-31` }
    }

    if (isUnlinked) {
      // 无关联账单：noteId 为空，在内存中过滤
    } else if (queryNoteIds.length === 1) {
      selector.noteId = queryNoteIds[0]
    } else if (queryNoteIds.length > 1) {
      selector.noteId = { $in: queryNoteIds }
    }

    const result = await db.bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()

    // 内存中精确过滤
    const allBills = result.map((doc: any) => doc.toJSON())
    const filteredBills: BillWithNoteTag[] = []

    for (const bill of allBills) {
      let rejected = false

      // noteId 匹配
      if (isUnlinked) {
        if (bill.noteId !== '') rejected = true
      } else {
        if (!queryNoteIds.includes(bill.noteId)) rejected = true
      }

      // 排除有子账单的父账单（只显示叶子节点）
      if (!rejected && bill.hasChildren) rejected = true

      // 月份匹配：分摊月份或账单日期
      if (!rejected) {
        const matchAllocated = bill.allocatedMonth === prefix
        const matchDate = bill.date.startsWith(prefix)
        if (!matchAllocated && !matchDate) rejected = true
      }

      // 类型过滤：只显示支出和退款
      if (!rejected) {
        if (bill.type !== 'expense' && !(bill.type === 'income' && bill.isRefund)) {
          rejected = true
        }
      }

      if (!rejected) {
        // 为子笔记的账单添加标签
        const noteTag = (!isUnlinked && bill.noteId !== props.noteId)
          ? getNoteNameById(bill.noteId)
          : undefined

        filteredBills.push({ ...bill, noteTag })
      }
    }

    bills.value = filteredBills
  } catch (e) {
    console.error('[NoteMonthBillsDialog] Failed to load bills:', e)
    bills.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) loadBills()
})

function openEditDialog(bill: BillWithNoteTag) {
  editingBill.value = bill
  billDialogVisible.value = true
}

async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
      showSuccess('账单已更新')
      await loadBills()
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
  if (!visible) selectedBill.value = undefined
}

function onAllocateDialogVisibleChange(visible: boolean) {
  allocateDialogVisible.value = visible
  if (!visible) selectedBill.value = undefined
}

function onRefundDialogVisibleChange(visible: boolean) {
  refundDialogVisible.value = visible
  if (!visible) selectedBill.value = undefined
}

async function handleSplitConfirm(splitItems: any[]) {
  if (!selectedBill.value) return
  try {
    await splitBill(selectedBill.value.id, splitItems)
    showSuccess('账单已拆分')
    splitDialogVisible.value = false
    selectedBill.value = undefined
    await loadBills()
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
    await loadBills()
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
    await loadBills()
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
    await loadBills()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}
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

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.summary-amount {
  font-size: 16px;
}

.summary-amount.expense {
  color: rgb(255, 59, 48);
}

.summary-amount.income {
  color: rgb(52, 199, 89);
}
</style>
