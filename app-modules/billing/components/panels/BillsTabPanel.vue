<template>
  <div class="tab-panel">
    <div class="panel-header bills-header">
      <!-- 第一行：视图切换 | 日期 -->
      <div class="header-row row-1">
        <BillViewToggle :mode="store.viewMode" @mode-change="store.viewMode = $event" />
        <BillDateFilter
          :year="billYearFilter"
          :month="billMonthFilter"
          :year-options="billYearOptions"
          :month-options="billMonthOptions"
          @year-change="emit('year-change', $event)"
          @month-change="emit('month-change', $event)"
        />
      </div>

      <!-- 第二行：统计 / 批量工具栏 -->
      <BillStatsBar
        v-if="!batchMode"
        :income="totalIncome"
        :expense="totalExpense"
        :balance="netBalance"
      />
      <BillBatchToolbar
        v-else
        :selected-count="selectedIds.length"
        :total-count="bills.length"
        @toggle-select-all="emit('toggle-select-all', $event)"
        @batch-delete="handleBatchDelete"
        @batch-edit="batchEditVisible = true"
        @exit="emit('exit-batch-mode')"
      />

      <!-- 第三行：预算执行进度条 -->
      <BudgetProgressBar
        v-if="!batchMode && budgetProgress.hasBudget"
        :progress="budgetProgress"
      />
    </div>

    <div class="list-container">
      <BillCalendar
        v-if="store.viewMode === 'calendar'"
        :bills="bills"
        :year="billYearFilter ?? undefined"
        :month="billMonthFilter ?? undefined"
        :loading="loading"
        @edit="(bill) => billDialogs.openBillDialog(bill)"
        @date-change="(year, month) => emit('calendar-date-change', year, month)"
      />
      <BillSkeleton v-else-if="loading && bills.length === 0" />
      <BillList
        v-else-if="store.viewMode === 'card'"
        :bills="bills"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="(bill) => billDialogs.openBillDialog(bill)"
        @delete="handleDeleteBill"
        @select="emit('select-bill', $event)"
        @select-all="emit('select-all-bills')"
        @unselect-all="emit('unselect-all-bills')"
      />
      <BillTable
        v-else
        :bills="bills"
        :accounts="accounts"
        :categories="categories"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="(bill) => billDialogs.openBillDialog(bill)"
        @delete="handleDeleteBill"
        @select="emit('select-bill', $event)"
        @select-all="emit('select-all-bills')"
        @unselect-all="emit('unselect-all-bills')"
      />
    </div>

    <LoadMoreButton
      v-if="hasMore && !isDateFiltered && !batchMode"
      :loading="loading"
      @click="handleLoadMore"
    />

    <BillDialog
      v-if="billDialogVisible"
      :visible="billDialogVisible"
      :bill="(editingBill ?? undefined) as Bill | undefined"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :default-note-id="noteId"
      :default-form-values="(editingBill ? undefined : lastBillDefaults ?? undefined) as Partial<BillFormData> | undefined"
      @confirm="handleBillConfirm"
      @cancel="billDialogs.closeBillDialog"
    />
    <BillBatchEditDialog
      v-if="batchEditVisible"
      :selected-bills="selectedBills"
      :accounts="accounts"
      :categories="categories"
      @confirm="handleBatchEditConfirm"
      @cancel="batchEditVisible = false"
    />
    <ImportDialog
      v-if="importDialogVisible"
      :visible="importDialogVisible"
      :note-id="noteId"
      :accounts="accounts"
      :categories="categories"
      :existing-fingerprints="existingFingerprints"
      @cancel="importDialogVisible = false"
      @record-created="emit('record-created', $event)"
      @view-record="emit('view-record', $event)"
      @open-rules="emit('open-rules-from-import')"
    />
    <ImportRecordDetail
      v-if="recordDetailVisible && recordDetailRecord"
      :visible="recordDetailVisible"
      :record="recordDetailRecord"
      :accounts="accounts"
      :categories="categories"
      @close="recordDetailVisible = false"
      @import="emit('import-record', $event)"
      @rollback="emit('rollback-record', $event)"
      @delete="emit('delete-record', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Bill, BillFormData } from '~/types/bill'
import { useBillingStore } from '~/stores/billing'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import type { ImportRecord } from '~/types/bill'
import BillDialog from '../BillDialog.vue'
import BillBatchEditDialog from '../BillBatchEditDialog.vue'
import ImportDialog from '../ImportDialog.vue'
import ImportRecordDetail from '../ImportRecordDetail.vue'
import BillBatchToolbar from '../BillBatchToolbar.vue'
import BillCalendar from '../BillCalendar.vue'
import BillList from '../BillList.vue'
import BillTable from '../BillTable.vue'
import BillViewToggle from '../common/BillViewToggle.vue'
import BillDateFilter from '../common/BillDateFilter.vue'
import BillStatsBar from '../common/BillStatsBar.vue'
import BudgetProgressBar from '../common/BudgetProgressBar.vue'
import BillSkeleton from '../common/BillSkeleton.vue'
import LoadMoreButton from '../common/LoadMoreButton.vue'
import { useBillDialogs } from '../../composables/useBillDialogs'

interface BudgetProgress {
  totalBudget: number
  actualExpense: number
  percentage: number
  rawPercentage: number
  isOver: boolean
  hasBudget: boolean
}

const props = defineProps<{
  bills: Bill[]
  batchMode: boolean
  selectedIds: string[]
  loading: boolean
  hasMore: boolean
  billYearFilter: number | null
  billMonthFilter: number | null
  billYearOptions: number[]
  billMonthOptions: number[]
  budgetProgress: BudgetProgress
  isDateFiltered: boolean
  noteId: string
  existingFingerprints: Set<string>
  deleteBills: (ids: string[]) => Promise<{ deletedCount: number }>
  updateBills: (ids: string[], data: Partial<BillFormData>) => Promise<{ updatedCount: number; failedIds: string[] }>
  createBillsBatch: (record: ImportRecord, noteId: string) => Promise<ImportRecord>
  loadMoreBills: (noteId: string) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'year-change', year: number | null): void
  (e: 'month-change', month: number | null): void
  (e: 'toggle-select-all', select: boolean): void
  (e: 'batch-delete'): void
  (e: 'exit-batch-mode'): void
  (e: 'calendar-date-change', year: number, month: number): void
  (e: 'load-more'): void
  (e: 'record-created', record: any): void
  (e: 'view-record', recordId: string): void
  (e: 'open-rules-from-import'): void
  (e: 'import-record', record: any): void
  (e: 'rollback-record', record: any): void
  (e: 'delete-record', recordId: string): void
  (e: 'select-bill', id: string): void
  (e: 'select-all-bills'): void
  (e: 'unselect-all-bills'): void
}>()

const store = useBillingStore()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()
const { accounts } = useAccounts()
const { categories } = useBillCategories()
const { noteOptions } = useNotes()
const { createBill, updateBill, deleteBill } = useBills()

// 对话框状态（使用单例与 BillingView 同步）
const billDialogs = useBillDialogs()
const { billDialogVisible, editingBill, lastBillDefaults, batchEditVisible, importDialogVisible, recordDetailVisible, recordDetailRecord } = billDialogs

// 计算属性
const totalIncome = computed(() =>
  props.bills.filter(b => b.type === 'income' && b.status === 'completed').reduce((sum, b) => sum + b.amount, 0)
)

const totalExpense = computed(() =>
  props.bills.filter(b => b.type === 'expense' && b.status === 'completed').reduce((sum, b) => sum + b.amount, 0)
)

const netBalance = computed(() => totalIncome.value - totalExpense.value)

const selectedBills = computed(() => props.bills.filter(b => props.selectedIds.includes(b.id)))

// 事件处理
async function handleDeleteBill(id: string) {
  if (!await confirm('确定删除此账单？')) return
  await deleteBill(id)
}

async function handleBatchDelete() {
  if (props.selectedIds.length === 0) return
  const ok = await confirm({ message: `确定删除选中的 ${props.selectedIds.length} 条账单？`, danger: true })
  if (!ok) return
  await props.deleteBills(props.selectedIds)
  emit('exit-batch-mode')
}

async function handleLoadMore() {
  await props.loadMoreBills(props.noteId)
}

async function handleBillConfirm(data: BillFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateBill(id, data)
      showSuccess('账单已更新')
    } else {
      await createBill(data, props.noteId)
      showSuccess('账单已添加')
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
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchEditConfirm(data: Partial<BillFormData>) {
  const ids = props.selectedIds
  if (ids.length === 0) return
  try {
    await props.updateBills(ids, data)
    showSuccess(`已更新 ${ids.length} 条账单`)
    batchEditVisible.value = false
    emit('exit-batch-mode')
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

/* 账单头部三行布局 */
.panel-header.bills-header {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-row.row-1 {
  justify-content: space-between;
}

.header-row.row-2 {
  justify-content: center;
}

.header-row.row-3 {
  justify-content: center;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
