<template>
  <BaseDialog
    :visible="visible"
    title="信用卡分期还款"
    size="medium"
    @update:visible="onClose"
  >
    <div v-if="account" class="installment-info">
      <div class="info-row">
        <span class="label">信用卡</span>
        <span class="value">{{ account.name }}</span>
      </div>
      <div class="info-row">
        <span class="label">当前待还</span>
        <span class="amount">{{ formatAmount(Math.max(0, -account.balance)) }}</span>
      </div>
    </div>

    <div class="installment-form">
      <div class="form-row">
        <div class="form-field">
          <label class="field-label">分期金额</label>
          <div class="amount-input-wrapper">
            <span class="currency-prefix">¥</span>
            <input
              v-model.number="form.totalAmount"
              type="number"
              class="amount-input"
              min="0"
              step="0.01"
              placeholder="输入分期金额"
            />
            <button
              v-if="account && account.balance < 0"
              type="button"
              class="quick-fill-btn"
              @click="form.totalAmount = Math.max(0, -account.balance)"
            >
              全部待还
            </button>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">分期期数</label>
          <div class="period-options">
            <button
              v-for="p in periodPresets"
              :key="p"
              type="button"
              class="period-chip"
              :class="{ active: form.periods === p }"
              @click="form.periods = p"
            >
              {{ p }}期
            </button>
            <input
              v-model.number="form.periods"
              type="number"
              class="period-input"
              min="1"
              max="60"
              placeholder="自定义"
            />
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label class="field-label">总手续费</label>
          <div class="amount-input-wrapper">
            <span class="currency-prefix">¥</span>
            <input
              v-model.number="form.totalFee"
              type="number"
              class="amount-input"
              min="0"
              step="0.01"
              placeholder="输入总手续费"
            />
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">首期还款日</label>
          <input
            v-model="form.firstDate"
            type="date"
            class="date-input"
          />
        </div>
      </div>

      <div class="form-field">
        <label class="field-label">还款账户</label>
        <AccountPicker
          v-model="form.fromAccountId"
          :accounts="repaymentAccounts"
          placeholder="选择还款账户"
        />
      </div>
    </div>

    <div class="preview-section">
      <label class="section-label">分期预览</label>
      <div class="preview-table">
        <div class="preview-header">
          <span>期数</span>
          <span>还款日</span>
          <span class="num">本金</span>
          <span class="num">手续费</span>
          <span class="num">合计</span>
        </div>
        <div
          v-for="(item, index) in previewItems"
          :key="index"
          class="preview-row"
        >
          <span>第 {{ index + 1 }} 期</span>
          <span>{{ item.date }}</span>
          <span class="num">{{ formatAmount(item.principal) }}</span>
          <span class="num">{{ formatAmount(item.fee) }}</span>
          <span class="num total">{{ formatAmount(item.amount) }}</span>
        </div>
        <div class="preview-footer">
          <span>合计</span>
          <span></span>
          <span class="num">{{ formatAmount(totalPrincipal) }}</span>
          <span class="num">{{ formatAmount(totalFee) }}</span>
          <span class="num total">{{ formatAmount(totalAmount) }}</span>
        </div>
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
        确认分期
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Account, InstallmentItem, InstallmentFormData } from '~/types/bill'
import { formatDateLocal } from '~/services/db'
import { useToast } from '~/composables/useToast'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import AccountPicker from './AccountPicker.vue'
import Decimal from 'decimal.js'
import { add } from '~/utils/decimal'

const { warning: showWarning } = useToast()

const props = defineProps<{
  visible: boolean
  account: Account | null
  accounts: Account[]
  defaultNoteId?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: InstallmentFormData, items: InstallmentItem[]]
}>()

const periodPresets = [3, 6, 12, 24]

const form = ref<{
  totalAmount: number
  periods: number
  totalFee: number
  firstDate: string
  fromAccountId: string
}>({
  totalAmount: 0,
  periods: 12,
  totalFee: 0,
  firstDate: '',
  fromAccountId: '',
})

// 可选的还款账户（排除当前信用卡）
const repaymentAccounts = computed(() =>
  props.accounts.filter(a => a.id !== props.account?.id)
)

function formatAmount(n: number): string {
  return n.toFixed(2)
}

function getRepaymentDate(baseDate: string, offset: number): string {
  const d = new Date(baseDate + 'T00:00:00')
  d.setMonth(d.getMonth() + offset)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthLabel(date: string): string {
  return date.slice(0, 7)
}

const previewItems = computed<InstallmentItem[]>(() => {
  const count = Math.max(1, Math.min(60, form.value.periods))
  const total = new Decimal(form.value.totalAmount)
  const fee = new Decimal(form.value.totalFee)
  const avgPrincipal = total.dividedBy(count).toDecimalPlaces(2)
  const avgFee = fee.dividedBy(count).toDecimalPlaces(2)
  const principalDiff = total.minus(avgPrincipal.times(count)).toDecimalPlaces(2)
  const feeDiff = fee.minus(avgFee.times(count)).toDecimalPlaces(2)

  const items: InstallmentItem[] = []
  for (let i = 0; i < count; i++) {
    const p = i === 0 ? avgPrincipal.plus(principalDiff).toNumber() : avgPrincipal.toNumber()
    const f = i === 0 ? avgFee.plus(feeDiff).toNumber() : avgFee.toNumber()
    const date = getRepaymentDate(form.value.firstDate, i)
    items.push({
      month: getMonthLabel(date),
      principal: p,
      fee: f,
      amount: add(p, f),
      date,
      description: `${props.account?.name || ''} 分期还款 第${i + 1}/${count}期`,
    })
  }
  return items
})

const totalPrincipal = computed(() =>
  previewItems.value.reduce((sum, item) => add(sum, item.principal), 0)
)

const totalFee = computed(() =>
  previewItems.value.reduce((sum, item) => add(sum, item.fee), 0)
)

const totalAmount = computed(() =>
  previewItems.value.reduce((sum, item) => add(sum, item.amount), 0)
)

const isValid = computed(() => {
  if (!props.account) return false
  if (form.value.totalAmount <= 0) return false
  if (form.value.periods < 1) return false
  if (!form.value.firstDate) return false
  if (!form.value.fromAccountId) return false
  return true
})

function onClose() {
  emit('update:visible', false)
}

function onConfirm() {
  if (!props.account) return
  if (!isValid.value) {
    showWarning('请填写完整的分期信息')
    return
  }
  const data: InstallmentFormData = {
    accountId: props.account.id,
    fromAccountId: form.value.fromAccountId,
    totalAmount: form.value.totalAmount,
    periods: form.value.periods,
    totalFee: form.value.totalFee,
    firstDate: form.value.firstDate,
    noteId: props.defaultNoteId || '',
  }
  emit('confirm', data, previewItems.value)
  emit('update:visible', false)
}

watch(() => props.visible, (visible) => {
  if (visible && props.account) {
    form.value.totalAmount = Math.max(0, -props.account.balance)
    form.value.periods = 12
    form.value.totalFee = 0
    // 默认首期还款日为下个月同一天
    const now = new Date()
    now.setMonth(now.getMonth() + 1)
    form.value.firstDate = formatDateLocal(now, 'date')
    form.value.fromAccountId = ''
  }
})
</script>

<style scoped>
.installment-info {
  padding: 12px;
  background: rgba(0, 122, 255, 0.06);
  border-radius: 10px;
  margin-bottom: 16px;
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
  color: rgb(255, 59, 48);
}

.installment-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
}

.currency-prefix {
  font-size: 14px;
  color: rgba(60, 60, 67, 0.5);
  font-weight: 500;
}

.amount-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  min-width: 0;
}

.amount-input::placeholder {
  color: rgba(60, 60, 67, 0.35);
}

.quick-fill-btn {
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.quick-fill-btn:hover {
  background: rgba(0, 122, 255, 0.18);
}

.period-options {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.period-chip {
  padding: 6px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.85);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.period-chip:hover {
  border-color: rgba(0, 122, 255, 0.4);
}

.period-chip.active {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgb(0, 122, 255);
  color: rgb(0, 122, 255);
  font-weight: 500;
}

.period-input {
  width: 60px;
  padding: 6px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  text-align: center;
  outline: none;
}

.period-input:focus {
  border-color: rgb(0, 122, 255);
}

.date-input {
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}

.date-input:focus {
  border-color: rgb(0, 122, 255);
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
}

.preview-table {
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  overflow: hidden;
  font-size: 13px;
}

.preview-header,
.preview-row,
.preview-footer {
  display: grid;
  grid-template-columns: 80px 1fr 80px 80px 80px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.preview-header {
  background: rgba(60, 60, 67, 0.04);
  font-weight: 600;
  color: rgba(60, 60, 67, 0.7);
  font-size: 12px;
}

.preview-row {
  border-top: 0.5px solid rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.preview-footer {
  border-top: 0.5px solid rgba(60, 60, 67, 0.2);
  background: rgba(60, 60, 67, 0.03);
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.preview-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.preview-table .total {
  color: rgb(0, 122, 255);
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
  background: rgb(0, 122, 255);
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: rgb(0, 106, 230);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .preview-header,
  .preview-row,
  .preview-footer {
    grid-template-columns: 60px 1fr 60px 60px 60px;
    gap: 4px;
    padding: 8px;
    font-size: 12px;
  }
}
</style>
