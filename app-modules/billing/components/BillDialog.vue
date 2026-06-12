<template>
  <BaseDialog
    :visible="visible"
    :title="isEditing ? '编辑账单' : '记一笔'"
    size="medium"
    @update:visible="onCancel"
  >
    <!-- 导入原数据卡片 -->
    <div v-if="importSourceItem" class="import-source-card">
      <div class="import-source-header">
        <Icon :name="ICONS.fileImport" size="14" />
        <span class="import-source-title">导入原数据</span>
        <span class="import-source-tag">{{ importSourceLabel }}</span>
      </div>
      <div class="import-source-body">
        <div class="import-source-row">
          <span class="import-source-label">交易对方</span>
          <span class="import-source-value">{{ importSourceItem.counterparty || '-' }}</span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">商品说明</span>
          <span class="import-source-value">{{ importSourceItem.description || '-' }}</span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">金额</span>
          <span class="import-source-value" :class="importSourceItem.direction">
            {{ importSourceItem.direction === 'in' ? '+' : '-' }}{{ importSourceItem.amount.toFixed(2) }}
          </span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">时间</span>
          <span class="import-source-value">{{ importSourceItem.date }}</span>
        </div>
        <div v-if="importSourceItem.rawType" class="import-source-row">
          <span class="import-source-label">类型</span>
          <span class="import-source-value">{{ importSourceItem.rawType }}</span>
        </div>
        <div v-if="importSourceItem.paymentMethod" class="import-source-row">
          <span class="import-source-label">支付方式</span>
          <span class="import-source-value">{{ importSourceItem.paymentMethod }}</span>
        </div>
      </div>
    </div>

    <BillForm
      v-model="form"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      @keydown="onKeyDown"
    />

    <template #footer>
      <div class="footer-left">
        <button
          v-if="isEditing && showSplitBtn"
          type="button"
          class="action-btn split-btn"
          :class="{ disabled: !canSplit }"
          :disabled="!canSplit"
          :title="splitTitle"
          @click="onSplit"
        >
          <Icon :name="SOLAR_ICONS.action.split" size="16" />
          {{ splitLabel }}
        </button>
        <button
          v-if="isEditing && showAllocateBtn"
          type="button"
          class="action-btn allocate-btn"
          :class="{ disabled: !canAllocate }"
          :disabled="!canAllocate"
          :title="allocateTitle"
          @click="onAllocate"
        >
          <Icon :name="SOLAR_ICONS.billing.calendar" size="16" />
          {{ allocateLabel }}
        </button>
        <button
          v-if="isEditing && showRefundBtn"
          type="button"
          class="action-btn refund-btn"
          :class="{ disabled: !canRefund }"
          :disabled="!canRefund"
          :title="refundTitle"
          @click="onRefund"
        >
          <Icon :name="SOLAR_ICONS.action.refresh" size="16" />
          {{ refundLabel }}
        </button>
      </div>
      <div class="footer-right">
        <button type="button" class="cancel-btn" @click="onCancel">取消</button>
        <button v-if="!isEditing" type="button" class="continue-btn" @click="onConfirmAndContinue">继续下一个</button>
        <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
      </div>
    </template>
  </BaseDialog>

  <!-- 拆分对话框 -->
  <BillSplitDialog
    v-if="splitDialogVisible && props.bill"
    :visible="splitDialogVisible"
    :bill="props.bill"
    :categories="categories"
    @update:visible="splitDialogVisible = $event"
    @confirm="handleSplitConfirm"
  />

  <!-- 分摊对话框 -->
  <BillAllocateDialog
    v-if="allocateDialogVisible && props.bill"
    :visible="allocateDialogVisible"
    :bill="props.bill"
    @update:visible="allocateDialogVisible = $event"
    @confirm="handleAllocateConfirm"
  />

  <!-- 退款对话框 -->
  <BillRefundDialog
    v-if="refundDialogVisible && props.bill"
    :visible="refundDialogVisible"
    :bill="props.bill"
    :accounts="accounts"
    @update:visible="refundDialogVisible = $event"
    @confirm="handleRefundConfirm"
  />
</template>

<script setup lang="ts">
import type { Bill, BillFormData, Account, BillCategory, ImportRecordItem, BillSplitItem, BillAllocateItem } from '~/types/bill'
import { toLocalISO } from '~/services/db'
import { useImportRecords } from '~/composables/useImportRecords'
import { useToast } from '~/composables/useToast'
import { useBills } from '~/composables/useBills'
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import BillForm from './BillForm.vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import BillSplitDialog from './BillSplitDialog.vue'
import BillAllocateDialog from './BillAllocateDialog.vue'
import BillRefundDialog from './BillRefundDialog.vue'

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  visible: boolean
  bill?: Bill
  accounts: Account[]
  categories: BillCategory[]
  noteOptions: NoteOption[]
  defaultNoteId?: string
  defaultFormValues?: Partial<BillFormData>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: BillFormData, isEditing: boolean, id?: string]
  'confirm-and-continue': [data: BillFormData]
  cancel: []
  'action-completed': []
}>()

const { warning: showWarning, success: showSuccess, error: showError } = useToast()
const { splitBill, allocatePeriod, createRefundBill } = useBills()

// 功能对话框状态
const splitDialogVisible = ref(false)
const allocateDialogVisible = ref(false)
const refundDialogVisible = ref(false)

const form = ref<BillFormData>({
  noteId: '', type: 'expense', amount: 0, currency: 'CNY',
  fromAccountId: '', toAccountId: '', categoryId: '',
  description: '', date: toLocalISO(),
  debtSubtype: 'lend', relatedPersonId: ''
})

const isEditing = computed(() => !!props.bill)

/* ---------- 账单状态 ---------- */
const isChildBill = computed(() => !!props.bill?.parentId)
const isRefundBill = computed(() => !!props.bill?.isRefund)
const hasChildren = computed(() => !!props.bill?.hasChildren)

/* ---------- 拆分 ---------- */
const showSplitBtn = computed(() => !isChildBill.value)
const canSplit = computed(() => !hasChildren.value)
const splitLabel = computed(() => hasChildren.value ? '已拆分' : '拆分')
const splitTitle = computed(() => {
  if (hasChildren.value) return '该账单已拆分'
  return '拆分账单'
})

/* ---------- 分摊 ---------- */
const showAllocateBtn = computed(() => !isChildBill.value)
const canAllocate = computed(() => !hasChildren.value)
const allocateLabel = computed(() => hasChildren.value ? '已分摊' : '分摊')
const allocateTitle = computed(() => {
  if (hasChildren.value) return '该账单已分摊'
  return '分摊到月份'
})

/* ---------- 退款 ---------- */
const showRefundBtn = computed(() => true)
const canRefund = computed(() => !isRefundBill.value)
const refundLabel = computed(() => '退款')
const refundTitle = computed(() => {
  if (isRefundBill.value) return '退款账单不可退款'
  return '退款'
})

/* ---------- 拆分/分摊/退款 ---------- */
function onSplit() {
  splitDialogVisible.value = true
}

function onAllocate() {
  allocateDialogVisible.value = true
}

function onRefund() {
  refundDialogVisible.value = true
}

/* ---------- 功能对话框确认处理 ---------- */
async function handleSplitConfirm(items: BillSplitItem[]) {
  if (!props.bill) return
  try {
    await splitBill(props.bill.id, items)
    showSuccess('账单已拆分')
    splitDialogVisible.value = false
    emit('action-completed')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleAllocateConfirm(items: BillAllocateItem[]) {
  if (!props.bill) return
  try {
    await allocatePeriod(props.bill.id, items)
    showSuccess('账单已分摊')
    allocateDialogVisible.value = false
    emit('action-completed')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRefundConfirm(amount: number, reason: string, date: string, accountId: string) {
  if (!props.bill) return
  try {
    await createRefundBill({ billId: props.bill.id, amount, reason, date, accountId })
    showSuccess('退款已创建')
    refundDialogVisible.value = false
    emit('action-completed')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

/* ---------- 导入原数据 ---------- */
const { getById } = useImportRecords()

const importSourceItem = computed<ImportRecordItem | null>(() => {
  const bill = props.bill
  if (!bill?.importBatchId || !bill.importFingerprint) return null
  const record = getById(bill.importBatchId)
  if (!record) return null
  return record.items.find(item => item.fingerprint === bill.importFingerprint) ?? null
})

const importSourceLabel = computed(() => {
  const bill = props.bill
  if (!bill?.importSource) return '导入'
  return bill.importSource === 'alipay' ? '支付宝' : bill.importSource === 'wechat' ? '微信' : bill.importSource === 'cmb' ? '招商银行' : '导入'
})

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.bill) {
    form.value = {
      noteId: props.bill.noteId,
      type: props.bill.type,
      amount: props.bill.amount,
      currency: props.bill.currency,
      fromAccountId: props.bill.fromAccountId,
      toAccountId: props.bill.toAccountId,
      categoryId: props.bill.categoryId,
      description: props.bill.description,
      date: props.bill.date?.slice(0, 16) || toLocalISO(),
      debtSubtype: props.bill.debtSubtype || 'lend',
      relatedPersonId: props.bill.relatedPersonId,
      isSavable: props.bill.isSavable || false
    }
  } else {
    const defaults = props.defaultFormValues || {}
    form.value = {
      noteId: props.defaultNoteId || '',
      type: defaults.type || 'expense',
      amount: 0,
      currency: defaults.currency || 'CNY',
      fromAccountId: defaults.fromAccountId || '',
      toAccountId: defaults.toAccountId || '',
      categoryId: defaults.categoryId || '',
      description: '',
      date: toLocalISO(),
      debtSubtype: 'lend',
      relatedPersonId: '',
      isSavable: false
    }
  }
}, { immediate: true })

/* ---------- 类型切换时自动清空不匹配的分类 ---------- */
watch(() => form.value.type, (newType, oldType) => {
  if (!oldType || newType === oldType) return
  // 收入/支出切换时，检查当前分类是否匹配新类型
  if ((newType === 'income' || newType === 'expense') && form.value.categoryId) {
    const cat = props.categories.find(c => c.id === form.value.categoryId)
    if (!cat || cat.type !== newType) {
      form.value.categoryId = ''
    }
  }
  // 转账/借贷不需要分类
  if (newType === 'transfer' || newType === 'debt') {
    form.value.categoryId = ''
  }
})

/* ---------- 分类切换时自动更新绑定笔记 ---------- */
// 用于区分初始化和用户主动修改
let isInitializing = ref(true)
let initializedCategoryId = ''

watch(() => props.visible, (v) => {
  if (v) {
    // 对话框打开时，标记为初始化状态
    isInitializing.value = true
    initializedCategoryId = form.value.categoryId
    // 延迟重置初始化标记，确保初始化完成
    nextTick(() => {
      isInitializing.value = false
    })
  }
})

watch(() => form.value.categoryId, (newCategoryId, oldCategoryId) => {
  // 跳过初始化阶段的变化
  if (isInitializing.value) return
  // 跳过从空到空的变化
  if (!oldCategoryId && !newCategoryId) return

  // 用户主动修改分类（从初始值变化或从旧值变化）
  if (newCategoryId && newCategoryId !== initializedCategoryId && newCategoryId !== oldCategoryId) {
    const newCategory = props.categories.find(c => c.id === newCategoryId)
    if (newCategory?.defaultNoteId) {
      form.value = { ...form.value, noteId: newCategory.defaultNoteId }
    }
  }
})

function validateForm(): boolean {
  if (form.value.amount <= 0) {
    showWarning('金额必须大于 0')
    return false
  }
  const t = form.value.type
  if (t === 'expense' && !form.value.fromAccountId) {
    showWarning('支出需要选择出账账户')
    return false
  }
  if (t === 'income' && !form.value.toAccountId) {
    showWarning('收入需要选择入账账户')
    return false
  }
  if (t === 'transfer' && (!form.value.fromAccountId || !form.value.toAccountId)) {
    showWarning('转账需要同时选择出账和入账账户')
    return false
  }
  if (form.value.fromAccountId && form.value.toAccountId &&
      form.value.fromAccountId === form.value.toAccountId) {
    showWarning('出账账户与入账账户不能相同')
    return false
  }
  return true
}

function onConfirm() {
  if (!validateForm()) return
  emit('confirm', form.value, isEditing.value, props.bill?.id)
}

function onConfirmAndContinue() {
  if (!validateForm()) return
  emit('confirm-and-continue', form.value)
  // 保留上一次填写的类型、账户、分类、币种，重置金额和描述
  form.value = {
    ...form.value,
    amount: 0,
    description: ''
  }
}

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  }
}

/* ---------- 外部调用：设置选中值（跨弹框联动） ---------- */
function setCategoryId(id: string) {
  form.value = { ...form.value, categoryId: id }
}
function setFromAccountId(id: string) {
  form.value = { ...form.value, fromAccountId: id }
}
function setToAccountId(id: string) {
  form.value = { ...form.value, toAccountId: id }
}

defineExpose({ setCategoryId, setFromAccountId, setToAccountId })
</script>

<style scoped>
.import-source-card {
  margin-bottom: 16px;
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(0, 122, 255, 0.02) 100%);
  overflow: hidden;
}

.import-source-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 122, 255, 0.06);
  border-bottom: 0.5px solid rgba(0, 122, 255, 0.12);
}

.import-source-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 122, 255, 0.9);
}

.import-source-tag {
  margin-left: auto;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.import-source-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.import-source-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.import-source-label {
  flex-shrink: 0;
  width: 60px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}

.import-source-value {
  color: rgba(0, 0, 0, 0.86);
  word-break: break-all;
}

.import-source-value.in {
  color: rgb(52, 199, 89);
  font-weight: 600;
}

.import-source-value.out {
  color: rgb(255, 59, 48);
  font-weight: 600;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--liquid-radius-button);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}

.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
}

.continue-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--liquid-radius-button);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
  transition: all 0.15s ease;
}

.continue-btn:hover {
  background: rgba(52, 199, 89, 0.2);
}

/* 底部按钮布局 */
.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  border: none;
  border-radius: var(--liquid-radius-button);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.7);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(60, 60, 67, 0.15);
  color: rgba(60, 60, 67, 0.9);
}

.action-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.split-btn:hover:not(:disabled) {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.allocate-btn:hover:not(:disabled) {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}

.refund-btn:hover:not(:disabled) {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}
</style>
