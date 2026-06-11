<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-overlay" @click.stop>
        <div class="drawer-panel" @click.stop>
          <!-- 头部 -->
          <div class="drawer-header">
            <div class="header-info">
              <span class="header-title">{{ displayNoteName }}</span>
              <span class="header-sub">{{ year }}年{{ month }}月账单</span>
            </div>
            <button class="close-btn" @click="close">
              <Icon :name="SOLAR_ICONS.action.close" size="18" />
            </button>
          </div>

          <!-- 搜索栏 -->
          <div class="drawer-search">
            <Icon :name="SOLAR_ICONS.search.default" size="16" class="search-icon" />
            <input
              v-model="billSearchQuery"
              type="text"
              placeholder="搜索账单..."
              class="search-input liquid-glass-input"
            />
            <button v-if="billSearchQuery" class="search-clear" @click="billSearchQuery = ''">
              <Icon :name="SOLAR_ICONS.action.close" size="14" />
            </button>
          </div>

          <!-- 多选工具栏 -->
          <div v-if="selectedBillIds.size > 0" class="select-toolbar">
            <span class="select-count">已选 {{ selectedBillIds.size }} 笔</span>
            <div class="select-actions">
              <button class="toolbar-btn" @click="selectAll">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
              <button class="toolbar-btn danger" @click="clearSelection">清除</button>
            </div>
          </div>

          <!-- 内容区 -->
          <div class="drawer-body">
            <div v-if="loading" class="loading">
              <span>加载中...</span>
            </div>

            <div v-else-if="filteredBills.length === 0" class="empty">
              <Icon :name="SOLAR_ICONS.doc.default" size="32" />
              <span>{{ bills.length === 0 ? '该月份暂无账单' : '无匹配结果' }}</span>
            </div>

            <div v-else class="bills-list">
              <BillListItem
                v-for="bill in filteredBills"
                :key="bill.id"
                :bill="bill"
                :all-bills="bills"
                :category-name="getCategoryName(bill.categoryId)"
                :account-name="getAccountName(bill)"
                :note-tag="bill.noteTag"
                :show-actions="true"
                :selectable="true"
                :selected="selectedBillIds.has(bill.id)"
                :draggable="true"
                @click="openEditDialog(bill)"
                @edit="openEditDialog(bill)"
                @delete="handleDelete(bill)"
                @split="handleSplit(bill)"
                @allocate="handleAllocate(bill)"
                @refund="handleRefund(bill)"
                @select="toggleSelect(bill.id)"
                @dragstart="onBillDragStart(bill, $event)"
                @dragend="billDragDrop.endBillDrag()"
              />
            </div>
          </div>

          <!-- 底部 -->
          <div class="drawer-footer">
            <span v-if="selectedBillIds.size > 0" class="drag-hint active">
              拖拽所选账单到左侧项目列即可关联
            </span>
            <span v-else class="drag-hint">拖拽账单到左侧项目列可关联项目</span>
            <span class="summary-amount" :class="{ expense: totalAmount < 0, income: totalAmount >= 0 }">
              {{ totalAmount >= 0 ? '+' : '' }}¥{{ totalAmount.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 编辑弹框 -->
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
    />

    <!-- 拆分对话框 -->
    <BillSplitDialog
      v-if="splitDialogVisible && operationBill"
      :visible="splitDialogVisible"
      :bill="operationBill"
      :categories="categories"
      @update:visible="onSplitDialogVisibleChange"
      @confirm="handleSplitConfirm"
    />

    <!-- 分摊对话框 -->
    <BillAllocateDialog
      v-if="allocateDialogVisible && operationBill"
      :visible="allocateDialogVisible"
      :bill="operationBill"
      @update:visible="onAllocateDialogVisibleChange"
      @confirm="handleAllocateConfirm"
    />

    <!-- 退款对话框 -->
    <BillRefundDialog
      v-if="refundDialogVisible && operationBill"
      :visible="refundDialogVisible"
      :bill="operationBill"
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
import { onCollectionChange } from '~/services/db'
import type { useBillDragDrop } from '~/composables/useBillDragDrop'
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

const billDragDrop = inject<ReturnType<typeof useBillDragDrop>>('billDragDrop')!

const { categories } = useBillCategories()
const { accounts } = useAccounts()
const { updateBill, deleteBill, splitBill, allocatePeriod, createRefund } = useBills()
const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const { getDescendantNoteIds, notes, noteOptions } = useNotes()

// 搜索
const billSearchQuery = ref('')

// 选择状态
const selectedBillIds = ref<Set<string>>(new Set())

const isAllSelected = computed(() =>
  filteredBills.value.length > 0 && selectedBillIds.value.size === filteredBills.value.length
)

function toggleSelect(billId: string) {
  const next = new Set(selectedBillIds.value)
  if (next.has(billId)) {
    next.delete(billId)
  } else {
    next.add(billId)
  }
  selectedBillIds.value = next
}

function selectAll() {
  if (isAllSelected.value) {
    selectedBillIds.value = new Set()
  } else {
    selectedBillIds.value = new Set(filteredBills.value.map(b => b.id))
  }
}

function clearSelection() {
  selectedBillIds.value = new Set()
}

// 拖拽
function onBillDragStart(bill: BillWithNoteTag, event: DragEvent) {
  const billIds = selectedBillIds.value.has(bill.id)
    ? [...selectedBillIds.value]
    : [bill.id]
  billDragDrop.startBillDrag(billIds, props.noteId, event)
}

// 账单编辑弹框状态
const billDialogVisible = ref(false)
const editingBill = ref<Bill | undefined>(undefined)

// 拆分、分摊、退款弹框状态
const splitDialogVisible = ref(false)
const allocateDialogVisible = ref(false)
const refundDialogVisible = ref(false)
const operationBill = ref<Bill | undefined>(undefined)

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

const loading = ref(false)
const bills = ref<BillWithNoteTag[]>([])

// 搜索过滤
const filteredBills = computed(() => {
  const q = billSearchQuery.value.trim().toLowerCase()
  if (!q) return bills.value
  return bills.value.filter(b => {
    if (b.description && b.description.toLowerCase().includes(q)) return true
    const catName = categoryMap.value[b.categoryId]?.name || ''
    if (catName.toLowerCase().includes(q)) return true
    const accName = getAccountName(b)
    if (accName.toLowerCase().includes(q)) return true
    return false
  })
})

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

async function loadBills(silent = false) {
  if (!silent) loading.value = true
  try {
    const prefix = `${props.year}-${String(props.month).padStart(2, '0')}`
    const { getDB } = await import('~/services/db')
    const db = await getDB()

    const isUnlinked = props.noteId === '__none__'
    const queryNoteIds = isUnlinked ? [] : getDescendantNoteIds(props.noteId)

    const selector: Record<string, unknown> = {
      date: { $gte: `${prefix}-01`, $lte: `${prefix}-31` }
    }

    if (isUnlinked) {
      // 无关联账单：在内存中过滤
    } else if (queryNoteIds.length === 1) {
      selector.noteId = queryNoteIds[0]
    } else if (queryNoteIds.length > 1) {
      selector.noteId = { $in: queryNoteIds }
    }

    const result = await db.bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()

    const allBills = result.map((doc: any) => doc.toJSON())
    const filteredBillsList: BillWithNoteTag[] = []

    for (const bill of allBills) {
      let rejected = false

      if (isUnlinked) {
        if (bill.noteId !== '') rejected = true
      } else {
        if (!queryNoteIds.includes(bill.noteId)) rejected = true
      }

      if (!rejected && bill.hasChildren) rejected = true

      if (!rejected) {
        const matchAllocated = bill.allocatedMonth === prefix
        const matchDate = bill.date.startsWith(prefix)
        if (!matchAllocated && !matchDate) rejected = true
      }

      if (!rejected) {
        if (bill.type !== 'expense' && !(bill.type === 'income' && bill.isRefund)) {
          rejected = true
        }
      }

      if (!rejected) {
        const noteTag = (!isUnlinked && bill.noteId !== props.noteId)
          ? getNoteNameById(bill.noteId)
          : undefined
        filteredBillsList.push({ ...bill, noteTag })
      }
    }

    bills.value = filteredBillsList
  } catch (e) {
    console.error('[NoteMonthBillsDrawer] Failed to load bills:', e)
    bills.value = []
  } finally {
    loading.value = false
  }
}

// 订阅管理
const unsubscribers: (() => void)[] = []

watch(() => props.visible, (v) => {
  if (v) {
    loadBills()
    if (unsubscribers.length === 0) {
      unsubscribers.push(
        onCollectionChange('bills', () => loadBills(true))
      )
    }
  } else {
    billDragDrop.resetDragState()
    clearSelection()
    billSearchQuery.value = ''
    unsubscribers.forEach(unsub => unsub())
    unsubscribers.length = 0
  }
})

onUnmounted(() => {
  unsubscribers.forEach(unsub => unsub())
  unsubscribers.length = 0
})

function close() {
  emit('update:visible', false)
}

function openEditDialog(bill: BillWithNoteTag) {
  editingBill.value = bill
  billDialogVisible.value = true
}

async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
      showSuccess('账单已更新')
    }
    billDialogVisible.value = false
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleSplit(bill: Bill) {
  operationBill.value = bill
  splitDialogVisible.value = true
}

function handleAllocate(bill: Bill) {
  operationBill.value = bill
  allocateDialogVisible.value = true
}

function handleRefund(bill: Bill) {
  operationBill.value = bill
  refundDialogVisible.value = true
}

function onSplitDialogVisibleChange(visible: boolean) {
  splitDialogVisible.value = visible
  if (!visible) operationBill.value = undefined
}

function onAllocateDialogVisibleChange(visible: boolean) {
  allocateDialogVisible.value = visible
  if (!visible) operationBill.value = undefined
}

function onRefundDialogVisibleChange(visible: boolean) {
  refundDialogVisible.value = visible
  if (!visible) operationBill.value = undefined
}

async function handleSplitConfirm(splitItems: any[]) {
  if (!operationBill.value) return
  try {
    await splitBill(operationBill.value.id, splitItems)
    showSuccess('账单已拆分')
    splitDialogVisible.value = false
    operationBill.value = undefined
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleAllocateConfirm(allocateItems: any[]) {
  if (!operationBill.value) return
  try {
    await allocatePeriod(operationBill.value.id, allocateItems)
    showSuccess('账单已分摊')
    allocateDialogVisible.value = false
    operationBill.value = undefined
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRefundConfirm(refundData: any) {
  if (!operationBill.value) return
  try {
    await createRefund(refundData)
    showSuccess('退款已创建')
    refundDialogVisible.value = false
    operationBill.value = undefined
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
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  justify-content: flex-end;
  pointer-events: auto;
}

.drawer-panel {
  width: 380px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-left: 0.5px solid rgba(255, 255, 255, 0.4);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-sub {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.drawer-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.06);
}

.search-icon {
  color: rgba(60, 60, 67, 0.35);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  flex-shrink: 0;
}

.search-clear:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.7);
}

.select-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 122, 255, 0.06);
  border-bottom: 0.5px solid rgba(0, 122, 255, 0.1);
}

.select-count {
  font-size: 13px;
  font-weight: 500;
  color: rgb(0, 122, 255);
}

.select-actions {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  font-size: 12px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: rgba(0, 122, 255, 0.18);
}

.toolbar-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.toolbar-btn.danger:hover {
  background: rgba(239, 68, 68, 0.18);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  color: var(--liquid-text-secondary, rgba(60, 60, 67, 0.5));
  font-size: 14px;
}

.bills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.drag-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.4);
  transition: color 0.15s;
}

.drag-hint.active {
  color: rgb(0, 122, 255);
  font-weight: 500;
}

.summary-amount {
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.summary-amount.expense {
  color: rgb(255, 59, 48);
}

.summary-amount.income {
  color: rgb(52, 199, 89);
}

/* 过渡动画 */
.drawer-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .drawer-panel {
    width: 85vw;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .drawer-panel {
    background: rgba(30, 30, 30, 0.92);
    border-left-color: rgba(255, 255, 255, 0.1);
    box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
  }

  .header-title {
    color: rgba(255, 255, 255, 0.92);
  }

  .header-sub {
    color: rgba(235, 235, 245, 0.55);
  }

  .close-btn {
    color: rgba(235, 235, 245, 0.5);
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
  }

  .drawer-header,
  .drawer-footer {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .drawer-search {
    border-color: rgba(255, 255, 255, 0.06);
  }

  .drag-hint {
    color: rgba(235, 235, 245, 0.4);
  }
}
</style>
