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
          @year-change="handleYearChange"
          @month-change="handleMonthChange"
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
        @toggle-select-all="$emit('toggle-select-all', $event)"
        @batch-delete="$emit('batch-delete')"
        @batch-edit="dialogs.batchEditVisible.value = true"
        @exit="$emit('exit-batch-mode')"
      />

      <!-- 第三行：预算执行进度条 -->
      <BudgetProgressBar
        v-if="!batchMode && budgetProgress.hasBudget"
        :progress="budgetProgress"
      />
    </div>

    <div class="list-container">
      <BillSkeleton v-if="loading && bills.length === 0" />
      <BillCalendar
        v-else-if="store.viewMode === 'calendar'"
        :bills="bills"
        :year="billYearFilter ?? undefined"
        :month="billMonthFilter ?? undefined"
        :loading="loading"
        @edit="$emit('edit-bill', $event)"
        @date-change="handleCalendarDateChange"
      />
      <BillList
        v-else-if="store.viewMode === 'card'"
        :bills="bills"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="$emit('edit-bill', $event)"
        @delete="$emit('delete-bill', $event)"
        @select="$emit('select-bill', $event)"
        @select-all="$emit('select-all-bills')"
        @unselect-all="$emit('unselect-all-bills')"
      />
      <BillTable
        v-else
        :bills="bills"
        :accounts="accounts"
        :categories="categories"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="$emit('edit-bill', $event)"
        @delete="$emit('delete-bill', $event)"
        @select="$emit('select-bill', $event)"
        @select-all="$emit('select-all-bills')"
        @unselect-all="$emit('unselect-all-bills')"
      />
    </div>

    <LoadMoreButton
      v-if="hasMore && !isDateFiltered && !batchMode"
      :loading="loading"
      @click="$emit('load-more')"
    />

    <BillDialog
      v-if="dialogs.billDialogVisible.value"
      :visible="dialogs.billDialogVisible.value"
      :bill="dialogs.editingBill.value || undefined"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :default-note-id="noteId"
      :default-form-values="dialogs.editingBill.value ? undefined : dialogs.lastBillDefaults.value || undefined"
      @confirm="(data, isEditing, id) => $emit('bill-confirm', data, isEditing, id)"
      @cancel="dialogs.closeBillDialog"
    />
    <BillBatchEditDialog
      v-if="dialogs.batchEditVisible.value"
      :selected-bills="selectedBills"
      :accounts="accounts"
      :categories="categories"
      @confirm="(data) => $emit('batch-edit-confirm', data)"
      @cancel="dialogs.batchEditVisible.value = false"
    />
    <ImportDialog
      v-if="dialogs.importDialogVisible.value"
      :visible="dialogs.importDialogVisible.value"
      :note-id="noteId"
      :accounts="accounts"
      :categories="categories"
      :existing-fingerprints="existingFingerprints"
      @cancel="dialogs.closeImportDialog"
      @record-created="(record) => $emit('record-created', record)"
      @view-record="(recordId) => $emit('view-record', recordId)"
      @open-rules="$emit('open-rules-from-import')"
    />
    <ImportRecordDetail
      v-if="dialogs.recordDetailVisible.value && dialogs.recordDetailRecord.value"
      :visible="dialogs.recordDetailVisible.value"
      :record="dialogs.recordDetailRecord.value"
      :accounts="accounts"
      :categories="categories"
      @close="dialogs.closeRecordDetail"
      @import="(record) => $emit('import-record', record)"
      @rollback="(record) => $emit('rollback-record', record)"
      @delete="(recordId) => $emit('delete-record', recordId)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Bill } from '~/types/bill'
import { computed } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useBillDialogs } from '../../composables/useBillDialogs'
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
}>()

const emit = defineEmits<{
  (e: 'year-change', year: number | null): void
  (e: 'month-change', month: number | null): void
  (e: 'toggle-select-all', select: boolean): void
  (e: 'batch-delete'): void
  (e: 'exit-batch-mode'): void
  (e: 'edit-bill', bill: Bill): void
  (e: 'delete-bill', id: string): void
  (e: 'select-bill', id: string): void
  (e: 'select-all-bills'): void
  (e: 'unselect-all-bills'): void
  (e: 'calendar-date-change', data: { year: number; month: number }): void
  (e: 'load-more'): void
  (e: 'bill-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'batch-edit-confirm', data: any): void
  (e: 'record-created', record: any): void
  (e: 'view-record', recordId: string): void
  (e: 'open-rules-from-import'): void
  (e: 'import-record', record: any): void
  (e: 'rollback-record', record: any): void
  (e: 'delete-record', recordId: string): void
}>()

const store = useBillingStore()
const { accounts } = useAccounts()
const { categories } = useBillCategories()
const { noteOptions } = useNotes()
const dialogs = useBillDialogs()

const totalIncome = computed(() =>
  props.bills.filter(b => b.type === 'income' && b.status === 'completed').reduce((sum, b) => sum + b.amount, 0)
)

const totalExpense = computed(() =>
  props.bills.filter(b => b.type === 'expense' && b.status === 'completed').reduce((sum, b) => sum + b.amount, 0)
)

const netBalance = computed(() => totalIncome.value - totalExpense.value)

const selectedBills = computed(() => props.bills.filter(b => props.selectedIds.includes(b.id)))

function handleYearChange(year: number | null) {
  emit('year-change', year)
}

function handleMonthChange(month: number | null) {
  emit('month-change', month)
}

function handleCalendarDateChange(year: number, month: number) {
  emit('calendar-date-change', { year, month })
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
