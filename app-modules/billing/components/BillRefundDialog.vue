<template>
  <BaseDialog
    :visible="visible"
    title="退款处理"
    size="small"
    @update:visible="onClose"
  >
    <div v-if="bill" class="refund-content">
      <!-- 原账单信息 -->
      <div class="liquid-glass-card original-bill-info">
        <div class="info-row">
          <span class="label">原账单</span>
          <span class="value">{{ bill.description || '未命名账单' }}</span>
        </div>
        <div class="info-row">
          <span class="label">原金额</span>
          <span class="amount amount-original">{{ formatAmount(bill.amount) }}</span>
        </div>
        <div class="info-row">
          <span class="label">已退款</span>
          <span class="amount amount-refunded">{{ formatAmount(totalRefunded) }}</span>
        </div>
        <div class="info-row highlight">
          <span class="label">可退余额</span>
          <span class="amount amount-remaining">{{ formatAmount(remainingAmount) }}</span>
        </div>
        <div class="info-row">
          <span class="label">日期</span>
          <span class="value">{{ formatDate(bill.date) }}</span>
        </div>
      </div>

      <!-- 退款历史 -->
      <div v-if="refundHistory.length > 0" class="refund-history">
        <div class="history-header">退款记录</div>
        <div class="history-list">
          <div
            v-for="refund in refundHistory"
            :key="refund.id"
            class="history-item liquid-glass-card"
          >
            <div class="history-left">
              <span class="history-date">{{ formatDate(refund.date) }}</span>
              <span v-if="refund.refundReason" class="history-reason">{{ refund.refundReason }}</span>
            </div>
            <span class="history-amount">{{ formatAmount(refund.amount) }}</span>
          </div>
        </div>
      </div>

      <!-- 退款表单 -->
      <div class="refund-form">
        <div class="form-section">
          <label class="section-label">退款方式</label>
          <div class="radio-group">
            <label class="radio-option" :class="{ active: refundMode === 'full' }">
              <input
                type="radio"
                value="full"
                v-model="refundMode"
              />
              <span>全额退款</span>
            </label>
            <label class="radio-option" :class="{ active: refundMode === 'partial' }">
              <input
                type="radio"
                value="partial"
                v-model="refundMode"
              />
              <span>部分退款</span>
            </label>
          </div>
        </div>

        <div v-if="refundMode === 'partial'" class="form-section">
          <label class="section-label">退款金额</label>
          <div class="amount-input-wrapper">
            <span class="currency-symbol">¥</span>
            <input
              type="number"
              class="liquid-glass-input amount-input"
              v-model.number="refundAmount"
              min="0.01"
              :max="remainingAmount"
              step="0.01"
              placeholder="请输入退款金额"
            />
          </div>
          <span class="hint">最大可退金额: {{ formatAmount(remainingAmount) }}</span>
        </div>

        <div class="form-section">
          <label class="section-label">退款账户</label>
          <AccountPicker
            v-model="refundAccountId"
            :accounts="accounts"
            placeholder="请选择退款账户"
          />
        </div>

        <div class="form-section">
          <label class="section-label">退款日期</label>
          <DateTimePicker v-model="refundDate" />
        </div>

        <div class="form-section">
          <label class="section-label">退款原因</label>
          <textarea
            class="liquid-glass-input reason-input"
            v-model="refundReason"
            rows="3"
            placeholder="请输入退款原因..."
          ></textarea>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="liquid-glass-button cancel-btn" @click="onClose">取消</button>
      <button
        type="button"
        class="liquid-glass-button liquid-glass-button-primary confirm-btn"
        :disabled="!isValid"
        @click="onConfirm"
      >
        确认退款
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Bill, Account } from '~/types/bill'
import { toLocalISO } from '~/services/db'
import { useToast } from '~/composables/useToast'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import DateTimePicker from './DateTimePicker.vue'
import AccountPicker from './AccountPicker.vue'
import { useBillRefunds } from '~/composables/useBillRefunds'

const { warning: showWarning } = useToast()

const props = defineProps<{
  visible: boolean
  bill: Bill | null
  accounts: Account[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [amount: number, reason: string, date: string, accountId: string]
}>()

const { getRefundsForBill } = useBillRefunds()

const refundMode = ref<'full' | 'partial'>('full')
const refundAmount = ref(0)
const refundReason = ref('')
const refundDate = ref('')
const refundAccountId = ref('')
const refundHistory = ref<Bill[]>([])
const totalRefunded = ref(0)

// 计算可退余额
const remainingAmount = computed(() => {
  if (!props.bill) return 0
  return Math.max(0, props.bill.amount - totalRefunded.value)
})

const isValid = computed(() => {
  if (!props.bill) return false
  if (!refundAccountId.value) return false
  if (remainingAmount.value <= 0) return false
  if (refundMode.value === 'full') return true
  return refundAmount.value > 0 && refundAmount.value <= remainingAmount.value
})

const finalAmount = computed(() => {
  if (!props.bill) return 0
  if (refundMode.value === 'full') return remainingAmount.value
  return refundAmount.value
})

// 加载退款历史
async function loadRefundHistory() {
  if (!props.bill) return
  refundHistory.value = await getRefundsForBill(props.bill.id)
  totalRefunded.value = refundHistory.value.reduce((sum, r) => sum + r.amount, 0)
}

function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function onClose() {
  emit('update:visible', false)
}

function getDefaultAccountId(bill: Bill): string {
  if (bill.type === 'expense') return bill.fromAccountId
  if (bill.type === 'income') return bill.toAccountId
  return bill.fromAccountId || bill.toAccountId || ''
}

function onConfirm() {
  if (!isValid.value) {
    showWarning('请填写完整的退款信息')
    return
  }
  emit('confirm', finalAmount.value, refundReason.value, refundDate.value, refundAccountId.value)
  emit('update:visible', false)
}

watch(() => props.visible, async (visible) => {
  if (visible && props.bill) {
    refundMode.value = remainingAmount.value > 0 ? 'full' : 'partial'
    refundAmount.value = 0
    refundReason.value = ''
    refundDate.value = toLocalISO()
    refundAccountId.value = getDefaultAccountId(props.bill)
    await loadRefundHistory()
  }
}, { immediate: true })

watch(refundMode, (mode) => {
  if (mode === 'full' && props.bill) {
    refundAmount.value = remainingAmount.value
  }
})
</script>

<style scoped>
.refund-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 20px);
}

/* 原账单信息卡片 */
.original-bill-info {
  padding: var(--space-md, 16px);
  background: rgba(255, 149, 0, 0.06);
  border: 1px solid rgba(255, 149, 0, 0.15);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-row .label {
  font-size: 14px;
  color: rgba(60, 60, 67, 0.7);
}

.info-row .value {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.info-row .amount {
  font-size: 16px;
  font-weight: 600;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.amount-original {
  color: var(--color-text, rgba(0, 0, 0, 0.85));
}

.amount-refunded {
  color: rgb(34, 197, 94);
}

.amount-remaining {
  color: rgb(255, 149, 0);
}

.info-row.highlight {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed rgba(255, 149, 0, 0.25);
}

/* 退款历史 */
.refund-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 12px);
}

.history-header {
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 8px);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm, 12px);
  background: rgba(34, 197, 94, 0.04);
  border: 1px solid rgba(34, 197, 94, 0.12);
}

.history-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-date {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
}

.history-reason {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.history-amount {
  font-size: 15px;
  font-weight: 600;
  color: rgb(34, 197, 94);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

/* 退款表单 */
.refund-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
}

.radio-group {
  display: flex;
  gap: var(--space-sm, 12px);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button, 14px);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--liquid-bg);
}

.radio-option:hover {
  background: var(--liquid-bg-thick);
  border-color: rgba(60, 60, 67, 0.25);
}

.radio-option.active {
  background: rgba(255, 149, 0, 0.1);
  border-color: rgba(255, 149, 0, 0.4);
  color: rgb(255, 149, 0);
}

.radio-option input[type="radio"] {
  display: none;
}

.amount-input-wrapper {
  position: relative;
}

.currency-symbol {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: rgba(60, 60, 67, 0.5);
  z-index: 1;
}

.amount-input {
  padding-left: 36px !important;
}

.hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.reason-input {
  min-height: 80px;
  resize: vertical;
}

.cancel-btn,
.confirm-btn {
  min-width: 80px;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
