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
        @split="handleSplitBill"
        @allocate="handleAllocateBill"
        @refund="handleRefundBill"
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
      @open-rule-dialog="handleOpenRuleDialog"
    />
    <RuleDialog
      v-if="ruleDialogVisible"
      :visible="ruleDialogVisible"
      :rule="editingRule"
      :initial-form="initialRuleForm"
      :accounts="accounts"
      :categories="categories"
      @confirm="handleRuleConfirm"
      @cancel="closeRuleDialog"
    />
    <BillSplitDialog
      v-if="splittingBill"
      v-model:visible="splitDialogVisible"
      :bill="splittingBill"
      :categories="categories"
      @confirm="handleSplitConfirm"
    />
    <BillAllocateDialog
      v-if="allocatingBill"
      v-model:visible="allocateDialogVisible"
      :bill="allocatingBill"
      @confirm="handleAllocateConfirm"
    />
    <BillRefundDialog
      v-if="refundingBill"
      v-model:visible="refundDialogVisible"
      :bill="refundingBill"
      :accounts="accounts"
      @confirm="handleRefundConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, onMounted } from 'vue'
import type { Bill, BillFormData, ImportRecord, ImportRule, ImportRuleFormData, BillSplitItem, BillAllocateItem, RefundFormData } from '~/types/bill'
import { useBillingStore } from '~/stores/billing'
import { useBills } from '~/composables/useBills'
import { useAccounts } from '~/composables/useAccounts'
import { sum, sub } from '~/utils/decimal'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useImportRecords } from '~/composables/useImportRecords'
import { useImportRules } from '~/composables/useImportRules'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import { dedupeKey, buildExactFingerprint } from '~/services/csvImport'
import { storeToRefs } from 'pinia'
import BillDialog from '../BillDialog.vue'
import BillBatchEditDialog from '../BillBatchEditDialog.vue'
import ImportDialog from '../ImportDialog.vue'
import ImportRecordDetail from '../ImportRecordDetail.vue'
import RuleDialog from '../RuleDialog.vue'
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
import BillSplitDialog from '../BillSplitDialog.vue'
import BillAllocateDialog from '../BillAllocateDialog.vue'
import BillRefundDialog from '../BillRefundDialog.vue'

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
const { createBill, updateBill, deleteBill, deleteBills, updateBills, createBillsBatch, loadMoreBills, hasMore, splitBill, allocatePeriod, createRefundBill } = useBills()
const { getById, rollback, deleteImportRecord, fingerprintsAcrossRecords, loadAllBillFingerprints } = useImportRecords()
const { rules: importRules, createImportRule, updateImportRule } = useImportRules()

// 对话框状态（使用单例与 BillingView 同步）
const billDialogs = useBillDialogs()
const { billDialogVisible, editingBill, lastBillDefaults, batchEditVisible, importDialogVisible, recordDetailVisible, recordDetailRecord } = billDialogs

// 规则对话框状态
const ruleDialogVisible = ref(false)
const editingRule = ref<ImportRule | undefined>(undefined)
const initialRuleForm = ref<ImportRuleFormData | undefined>(undefined)
const pendingRuleCallback = ref<((rule?: ImportRule) => void) | undefined>(undefined)

// 拆分/分摊/退款对话框状态
const splitDialogVisible = ref(false)
const splittingBill = ref<Bill | undefined>(undefined)
const allocateDialogVisible = ref(false)
const allocatingBill = ref<Bill | undefined>(undefined)
const refundDialogVisible = ref(false)
const refundingBill = ref<Bill | undefined>(undefined)

// 计算属性
const totalIncome = computed(() =>
  sum(props.bills.filter(b => b.type === 'income' && b.status === 'completed').map(b => b.amount))
)

const totalExpense = computed(() =>
  sum(props.bills.filter(b => b.type === 'expense' && b.status === 'completed').map(b => b.amount))
)

const netBalance = computed(() => sub(totalIncome.value, totalExpense.value))

const selectedBills = computed(() => props.bills.filter(b => props.selectedIds.includes(b.id)))

// 从数据库加载的所有账单指纹（异步加载）
const allBillFingerprints = ref<Set<string>>(new Set())

// 现有指纹（用于导入去重）
const existingFingerprints = computed(() => {
  const set = new Set<string>(allBillFingerprints.value)

  // 从导入记录中的指纹补充
  for (const fp of fingerprintsAcrossRecords.value) set.add(fp)

  return set
})

// 加载所有账单指纹
async function refreshBillFingerprints() {
  allBillFingerprints.value = await loadAllBillFingerprints(props.noteId)
}

// 组件挂载时加载指纹
onMounted(() => {
  refreshBillFingerprints()
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

// 规则对话框事件处理
function handleOpenRuleDialog(form: ImportRuleFormData, options?: { rule?: ImportRule; onSaved?: (rule?: ImportRule) => void }) {
  editingRule.value = options?.rule
  initialRuleForm.value = { ...form }
  pendingRuleCallback.value = options?.onSaved
  ruleDialogVisible.value = true
}

async function handleRuleConfirm(data: ImportRuleFormData, isEditing: boolean, id?: string) {
  try {
    if (!data.pattern.trim()) {
      showError('请输入匹配关键字')
      return
    }
    let rule: ImportRule | undefined
    if (isEditing && id) {
      await updateImportRule(id, data)
      showSuccess('规则已更新')
      rule = importRules.value.find(r => r.id === id)
    } else {
      rule = await createImportRule(data)
      showSuccess('规则已添加')
    }
    pendingRuleCallback.value?.(rule)
    closeRuleDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function closeRuleDialog() {
  ruleDialogVisible.value = false
  editingRule.value = undefined
  initialRuleForm.value = undefined
  pendingRuleCallback.value = undefined
}

// 拆分/分摊/退款事件处理
function handleSplitBill(bill: Bill) {
  splittingBill.value = bill
  splitDialogVisible.value = true
}

function handleAllocateBill(bill: Bill) {
  allocatingBill.value = bill
  allocateDialogVisible.value = true
}

function handleRefundBill(bill: Bill) {
  refundingBill.value = bill
  refundDialogVisible.value = true
}

async function handleSplitConfirm(splitItems: BillSplitItem[]) {
  if (!splittingBill.value) return
  try {
    await splitBill(splittingBill.value.id, splitItems)
    showSuccess('账单已拆分')
    splitDialogVisible.value = false
    splittingBill.value = undefined
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleAllocateConfirm(allocateItems: BillAllocateItem[]) {
  if (!allocatingBill.value) return
  try {
    await allocatePeriod(allocatingBill.value.id, allocateItems)
    showSuccess('账单已分摊')
    allocateDialogVisible.value = false
    allocatingBill.value = undefined
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRefundConfirm(amount: number, reason: string, date: string, accountId: string) {
  if (!refundingBill.value) return
  try {
    await createRefundBill({ billId: refundingBill.value.id, amount, reason, date, accountId })
    showSuccess('退款账单已创建')
    refundDialogVisible.value = false
    refundingBill.value = undefined
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
