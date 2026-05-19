<template>
  <BaseDialog
    :visible="visible"
    title="拆分账单"
    size="medium"
    @update:visible="onClose"
  >
    <div v-if="bill" class="split-info">
      <div class="info-row">
        <span class="label">原账单金额</span>
        <span class="amount">{{ formatAmount(bill.amount) }}</span>
      </div>
      <div class="info-row">
        <span class="label">已分配</span>
        <span class="amount" :class="{ valid: isAmountValid, invalid: !isAmountValid }">
          {{ formatAmount(totalAllocated) }} / {{ formatAmount(bill.amount) }}
        </span>
      </div>
    </div>

    <div class="split-items">
      <div
        v-for="(item, index) in splitItems"
        :key="index"
        class="split-item"
      >
        <div class="item-header">
          <span class="item-index">拆分 {{ index + 1 }}</span>
          <button type="button" class="delete-btn" @click="removeItem(index)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="16" />
          </button>
        </div>
        <div class="item-fields">
          <div class="field-row">
            <label>分类</label>
            <CategoryPicker
              :model-value="item.categoryId"
              :categories="categories"
              placeholder="选择分类"
              @update:model-value="updateItem(index, 'categoryId', $event)"
            />
          </div>
          <div class="field-row">
            <label>金额</label>
            <AmountInput
              :model-value="item.amount"
              @update:model-value="updateItem(index, 'amount', $event)"
            />
          </div>
          <div class="field-row">
            <label>描述</label>
            <input
              type="text"
              class="desc-input"
              :value="item.description"
              placeholder="可选描述"
              @input="updateItem(index, 'description', ($event.target as HTMLInputElement)?.value || '')"
            />
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="add-btn" @click="addItem">
      <Icon name="solar:add-circle-linear" size="16" />
      添加拆分项
    </button>

    <template #footer>
      <button type="button" class="cancel-btn" @click="onClose">取消</button>
      <button
        type="button"
        class="confirm-btn"
        :disabled="!isAmountValid || splitItems.length === 0"
        @click="onConfirm"
      >
        确认拆分
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Bill, BillCategory, BillSplitItem } from '~/types/bill'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import { sum, eq } from '~/utils/decimal'
import CategoryPicker from './CategoryPicker.vue'
import AmountInput from './AmountInput.vue'

const props = defineProps<{
  visible: boolean
  bill: Bill | null
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [items: BillSplitItem[]]
}>()

const splitItems = ref<BillSplitItem[]>([
  { categoryId: '', amount: 0, description: '' }
])

const totalAllocated = computed(() =>
  sum(splitItems.value.map(item => item.amount || 0))
)

const isAmountValid = computed(() => {
  if (!props.bill) return false
  return eq(totalAllocated.value, props.bill.amount, 0.01)
})

function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`
}

function updateItem(index: number, field: keyof BillSplitItem, value: string | number) {
  const item = { ...splitItems.value[index] }
  item[field] = value as never
  splitItems.value[index] = item
}

function addItem() {
  splitItems.value.push({ categoryId: '', amount: 0, description: '' })
}

function removeItem(index: number) {
  if (splitItems.value.length > 1) {
    splitItems.value.splice(index, 1)
  }
}

function onClose() {
  emit('update:visible', false)
}

function onConfirm() {
  if (isAmountValid.value && splitItems.value.length > 0) {
    emit('confirm', splitItems.value.filter(item => item.amount > 0 && item.categoryId))
    emit('update:visible', false)
  }
}

watch(() => props.visible, (visible) => {
  if (visible && props.bill) {
    splitItems.value = [{ categoryId: '', amount: 0, description: '' }]
  }
})
</script>

<style scoped>
.split-info {
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

.info-row .amount {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.info-row .amount.valid {
  color: rgb(52, 199, 89);
}

.info-row .amount.invalid {
  color: rgb(255, 59, 48);
}

.split-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 12px);
  margin-bottom: var(--space-md, 16px);
  max-height: 360px;
  overflow-y: auto;
}

.split-item {
  padding: var(--space-sm, 12px);
  background: rgba(60, 60, 67, 0.04);
  border-radius: 10px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-index {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 59, 48, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.item-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-row label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}

.desc-input {
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(0, 0, 0, 0.85);
  transition: border-color 0.15s ease;
}

.desc-input:focus {
  outline: none;
  border-color: rgb(0, 122, 255);
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border: 0.5px dashed rgba(60, 60, 67, 0.3);
  border-radius: 10px;
  background: transparent;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-btn:hover {
  border-color: rgb(0, 122, 255);
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
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
