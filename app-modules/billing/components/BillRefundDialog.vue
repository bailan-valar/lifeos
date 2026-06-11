<template>
  <BaseDialog
    :visible="visible"
    title="退款处理"
    size="small"
    @update:visible="onClose"
  >
    <div v-if="bill" class="refund-info">
      <div class="info-row">
        <span class="label">原账单</span>
        <span class="value">{{ bill.description || '未命名账单' }}</span>
      </div>
      <div class="info-row">
        <span class="label">原金额</span>
        <span class="amount">{{ formatAmount(bill.amount) }}</span>
      </div>
      <div class="info-row">
        <span class="label">日期</span>
        <span class="value">{{ formatDate(bill.date) }}</span>
      </div>
    </div>

    <div class="refund-form">
      <div class="form-section">
        <label class="section-label">退款方式</label>
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              :value="'full'"
              v-model="refundMode"
            />
            <span>全额退款</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              :value="'partial'"
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
            class="amount-input"
            v-model.number="refundAmount"
            min="0.01"
            :max="maxRefundAmount"
            step="0.01"
          />
        </div>
        <span class="hint">最大可退金额: {{ formatAmount(maxRefundAmount) }}</span>
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
          class="reason-input"
          v-model="refundReason"
          rows="3"
          placeholder="请输入退款原因..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button type="button" class="cancel-btn" @click="onClose">取消</button>
      <button
        type="button"
        class="confirm-btn"
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

const refundMode = ref<'full' | 'partial'>('full')
const refundAmount = ref(0)
const refundReason = ref('')
const refundDate = ref('')
const refundAccountId = ref('')

const maxRefundAmount = computed(() => props.bill?.amount || 0)

const isValid = computed(() => {
  if (!props.bill) return false
  if (!refundAccountId.value) return false
  if (refundMode.value === 'full') return true
  return refundAmount.value > 0 && refundAmount.value <= maxRefundAmount.value
})

const finalAmount = computed(() => {
  if (!props.bill) return 0
  return refundMode.value === 'full' ? props.bill.amount : refundAmount.value
})

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

watch(() => props.visible, (visible) => {
  if (visible && props.bill) {
    refundMode.value = 'full'
    refundAmount.value = 0
    refundReason.value = ''
    refundDate.value = toLocalISO()
    refundAccountId.value = getDefaultAccountId(props.bill)
  }
}, { immediate: true })

watch(refundMode, (mode) => {
  if (mode === 'full' && props.bill) {
    refundAmount.value = props.bill.amount
  }
})
</script>

<style scoped>
.refund-info {
  padding: var(--space-sm, 12px);
  background: rgba(255, 149, 0, 0.08);
  border-radius: var(--liquid-radius-button, 14px);
  margin-bottom: var(--space-md, 16px);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
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
  font-size: 15px;
  font-weight: 600;
  color: rgb(255, 149, 0);
}

.refund-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  cursor: pointer;
}

.radio-option input[type="radio"] {
  accent-color: rgb(255, 149, 0);
  width: 16px;
  height: 16px;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.currency-symbol {
  position: absolute;
  left: 12px;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.5);
}

.amount-input {
  width: 100%;
  padding: 10px 12px 10px 28px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
}

.amount-input:focus {
  outline: none;
  border-color: rgb(255, 149, 0);
}

.hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.reason-input {
  width: 100%;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(0, 0, 0, 0.85);
  transition: border-color 0.15s ease;
}

.reason-input:focus {
  outline: none;
  border-color: rgb(255, 149, 0);
}

.reason-input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--liquid-radius-button, 14px);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancel-btn {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.85);
}

.cancel-btn:hover {
  background: rgba(60, 60, 67, 0.15);
}

.confirm-btn {
  background: rgb(255, 149, 0);
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: rgb(230, 134, 0);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
