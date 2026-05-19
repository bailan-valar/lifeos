<template>
  <BaseDialog
    :visible="visible"
    title="分摊到月份"
    size="small"
    @update:visible="onClose"
  >
    <div v-if="bill" class="allocate-info">
      <div class="info-row">
        <span class="label">原账单</span>
        <span class="value">{{ bill.description || '未命名账单' }}</span>
      </div>
      <div class="info-row">
        <span class="label">金额</span>
        <span class="amount">{{ formatAmount(bill.amount) }}</span>
      </div>
      <div class="info-row">
        <span class="label">支付日期</span>
        <span class="value">{{ formatDate(bill.date) }}</span>
      </div>
    </div>

    <div class="allocate-form">
      <div class="form-section">
        <label class="section-label">分摊方式</label>
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              :value="'average'"
              v-model="allocateMode"
            />
            <span>平均分摊</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              :value="'custom'"
              v-model="allocateMode"
            />
            <span>自定义金额</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">分摊月数</label>
        <div class="month-input">
          <input
            type="number"
            v-model.number="monthCount"
            min="1"
            max="36"
            @input="updateAllocation"
          />
          <span>个月</span>
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">分摊预览</label>
        <div class="allocate-preview">
          <div
            v-for="(item, index) in allocateItems"
            :key="index"
            class="preview-item"
          >
            <span class="preview-month">{{ item.month }}</span>
            <input
              type="date"
              class="preview-date-input"
              :value="item.date"
              @input="updateItemDate(index, ($event.target as HTMLInputElement).value)"
            />
            <input
              v-if="allocateMode === 'custom'"
              type="number"
              class="preview-amount-input"
              v-model.number="item.amount"
              @input="checkTotal"
            />
            <span v-else class="preview-amount">{{ formatAmount(item.amount) }}</span>
          </div>
          <div class="preview-total">
            <span>合计</span>
            <span :class="{ valid: isTotalValid, invalid: !isTotalValid }">
              {{ formatAmount(totalAllocated) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="cancel-btn" @click="onClose">取消</button>
      <button
        type="button"
        class="confirm-btn"
        :disabled="!isTotalValid || allocateItems.length === 0"
        @click="onConfirm"
      >
        确认分摊
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Bill, BillAllocateItem } from '~/types/bill'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import Decimal from 'decimal.js'
import { sum, eq } from '~/utils/decimal'

const props = defineProps<{
  visible: boolean
  bill: Bill | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [items: BillAllocateItem[]]
}>()

const allocateMode = ref<'average' | 'custom'>('average')
const monthCount = ref(3)
const allocateItems = ref<BillAllocateItem[]>([])

const totalAllocated = computed(() =>
  sum(allocateItems.value.map(item => item.amount || 0))
)

const isTotalValid = computed(() => {
  if (!props.bill) return false
  return eq(totalAllocated.value, props.bill.amount, 0.01)
})

function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getNextMonth(date: Date, offset: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getNextDate(date: Date, offset: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + offset)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function updateAllocation() {
  if (!props.bill) return

  const count = Math.max(1, Math.min(36, monthCount.value))
  const baseDate = new Date(props.bill.date)
  const total = new Decimal(props.bill.amount)
  const avg = total.dividedBy(count).toDecimalPlaces(2)
  const diff = total.minus(avg.times(count)).toDecimalPlaces(2)

  allocateItems.value = Array.from({ length: count }, (_, i) => ({
    month: getNextMonth(baseDate, i + 1),
    date: getNextDate(baseDate, i + 1),
    amount: i === 0 ? avg.plus(diff).toNumber() : avg.toNumber(),
    description: `${props.bill?.description || ''} (${i + 1}/${count})`
  }))
}

function updateItemDate(index: number, date: string) {
  const item = { ...allocateItems.value[index] }
  item.date = date
  if (date) {
    item.month = date.slice(0, 7)
  }
  allocateItems.value[index] = item
}

function checkTotal() {
  // 自定义模式下只更新总计显示，不自动调整
}

function onClose() {
  emit('update:visible', false)
}

function onConfirm() {
  if (isTotalValid.value && allocateItems.value.length > 0) {
    emit('confirm', allocateItems.value)
    emit('update:visible', false)
  }
}

watch(() => props.visible, (visible) => {
  if (visible && props.bill) {
    monthCount.value = 3
    allocateMode.value = 'average'
    updateAllocation()
  }
})

watch(allocateMode, () => {
  if (allocateMode.value === 'average') {
    updateAllocation()
  }
})
</script>

<style scoped>
.allocate-info {
  padding: var(--space-sm, 12px);
  background: rgba(0, 122, 255, 0.06);
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
  color: rgb(0, 122, 255);
}

.allocate-form {
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
  accent-color: rgb(0, 122, 255);
  width: 16px;
  height: 16px;
}

.month-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-input input {
  width: 80px;
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.month-input span {
  font-size: 14px;
  color: rgba(60, 60, 67, 0.7);
}

.allocate-preview {
  padding: 10px;
  background: rgba(60, 60, 67, 0.03);
  border-radius: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-month {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
  min-width: 60px;
  white-space: nowrap;
}

.preview-amount {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.preview-date-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  background: rgba(255, 255, 255, 0.9);
}

.preview-date-input:focus {
  outline: none;
  border-color: rgb(0, 122, 255);
}

.preview-amount-input {
  width: 80px;
  padding: 4px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  font-size: 13px;
  text-align: right;
}

.preview-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 4px;
  margin-top: 4px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.2);
  font-weight: 600;
}

.preview-total span:first-child {
  font-size: 14px;
  color: rgba(60, 60, 67, 0.8);
}

.preview-total span:last-child.valid {
  font-size: 15px;
  color: rgb(52, 199, 89);
}

.preview-total span:last-child.invalid {
  font-size: 15px;
  color: rgb(255, 59, 48);
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
</style>
