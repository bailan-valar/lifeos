<template>
  <div class="tab-panel">
    <div class="panel-header bills-header">
      <!-- 第一行：视图切换 | 日期 -->
      <div class="header-row row-1">
        <BillViewToggle :mode="store.viewMode" @mode-change="store.viewMode = $event" />
        <BillDateFilter />
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
      <BudgetProgressBar v-if="!batchMode" :note-id="noteId" />
    </div>

    <div class="list-container">
      <BillCalendar
        v-if="store.viewMode === 'calendar'"
        :bills="bills"
        :loading="loading"
        @edit="(bill) => billDialogs.openBillDialog(bill)"
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
      @record-created="handleRecordCreated"
      @view-record="handleViewRecord"
      @open-rules="emit('open-rules-from-import')"
    />
    <ImportRecordDetail
      v-if="recordDetailVisible && recordDetailRecord"
      :visible="recordDetailVisible"
      :record="recordDetailRecord"
      :accounts="accounts"
      :categories="categories"
      @close="recordDetailVisible = false"
      @import="handleImportRecord"
      @rollback="handleRollbackRecord"
      @delete="handleDeleteRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Bill, BillFormData, ImportRecord } from '~/types/bill'
import { useBillingStore } from '~/stores/billing'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useImportRecords } from '~/composables/useImportRecords'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import { dedupeKey } from '~/services/csvImport'
import { storeToRefs } from 'pinia'
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

const props = defineProps<{
  bills: Bill[]
  batchMode: boolean
  selectedIds: string[]
  loading: boolean
  noteId: string
}>()

const emit = defineEmits<{
  (e: 'toggle-select-all', select: boolean): void
  (e: 'exit-batch-mode'): void
  (e: 'open-rules-from-import'): void
  (e: 'select-bill', id: string): void
  (e: 'select-all-bills'): void
  (e: 'unselect-all-bills'): void
}>()

const store = useBillingStore()
const { isDateFiltered } = storeToRefs(store)
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()
const { accounts } = useAccounts()
const { categories } = useBillCategories()
const { noteOptions } = useNotes()
const { createBill, updateBill, deleteBill, deleteBills, updateBills, createBillsBatch, loadMoreBills, hasMore } = useBills()
const { getById, rollback, deleteImportRecord, fingerprintsAcrossRecords } = useImportRecords()

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

// 现有指纹（用于导入去重）
const existingFingerprints = computed(() => {
  const set = new Set<string>()
  for (const b of props.bills) {
    set.add(dedupeKey(b.date, b.amount, b.counterpartyRaw || b.description || ''))
  }
  for (const fp of fingerprintsAcrossRecords.value) set.add(fp)
  return set
})

// 事件处理
async function handleDeleteBill(id: string) {
  if (!await confirm('确定删除此账单？')) return
  await deleteBill(id)
}

async function handleBatchDelete() {
  if (props.selectedIds.length === 0) return
  const ok = await confirm({ message: `确定删除选中的 ${props.selectedIds.length} 条账单？`, danger: true })
  if (!ok) return
  await deleteBills(props.selectedIds)
  emit('exit-batch-mode')
}

async function handleLoadMore() {
  await loadMoreBills(props.noteId)
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
    await updateBills(ids, data)
    showSuccess(`已更新 ${ids.length} 条账单`)
    batchEditVisible.value = false
    emit('exit-batch-mode')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

// 导入相关事件（内化处理）
function handleRecordCreated(record: ImportRecord) {
  billDialogs.closeImportDialog()
  billDialogs.setRecordDetailRecord(record)
  billDialogs.recordDetailVisible.value = true
}

function handleViewRecord(recordId: string) {
  const record = getById(recordId)
  billDialogs.setRecordDetailRecord(record)
  billDialogs.recordDetailVisible.value = true
}

async function handleImportRecord(record: ImportRecord) {
  try {
    const result = await createBillsBatch(record, props.noteId)
    if (result.failedCount > 0) {
      showError(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条 · 失败 ${result.failedCount} 条`)
    } else {
      showSuccess(`已导入 ${result.successCount} 条 · 跳过 ${result.skippedCount} 条`)
    }
    billDialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRollbackRecord(record: ImportRecord) {
  const ok = await confirm(`确定回滚此次导入?将删除 ${record.billIds.length} 条账单并恢复账户余额。`)
  if (!ok) return
  try {
    const { rolledBack, missing } = await rollback(record.id)
    if (missing > 0) {
      showSuccess(`已回滚 ${rolledBack} 条,${missing} 条已不存在`)
    } else {
      showSuccess(`已回滚 ${rolledBack} 条`)
    }
    billDialogs.closeRecordDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleDeleteRecord(recordId: string) {
  const ok = await confirm('确定删除此导入记录?')
  if (!ok) return
  try {
    await deleteImportRecord(recordId)
    showSuccess('导入记录已删除')
    billDialogs.closeRecordDetail()
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
