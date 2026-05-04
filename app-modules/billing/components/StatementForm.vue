<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">应还金额</label>
      <input
        :value="form.statementAmount"
        class="form-input"
        type="number"
        min="0"
        step="0.01"
        @input="onAmountInput('statementAmount', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="form-group">
      <label class="form-label">最低还款</label>
      <input
        :value="form.minimumPayment"
        class="form-input"
        type="number"
        min="0"
        step="0.01"
        @input="onAmountInput('minimumPayment', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="form-group">
      <label class="form-label">已还金额</label>
      <input
        :value="form.paidAmount"
        class="form-input"
        type="number"
        min="0"
        step="0.01"
        @input="onAmountInput('paidAmount', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="form-group">
      <label class="form-label">状态</label>
      <div class="type-selector">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          class="type-btn"
          :class="{ active: form.status === opt.value }"
          @click="onStatusChange(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatementFormData, StatementStatus } from '~/types/bill'

const props = defineProps<{
  modelValue: StatementFormData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StatementFormData): void
}>()

const statusOptions: Array<{ value: StatementStatus; label: string }> = [
  { value: 'pending', label: '待还款' },
  { value: 'partial', label: '部分已还' },
  { value: 'paid', label: '已结清' },
  { value: 'overdue', label: '已逾期' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function onAmountInput(key: 'statementAmount' | 'minimumPayment' | 'paidAmount', raw: string) {
  const v = parseFloat(raw)
  emit('update:modelValue', {
    ...form.value,
    [key]: isNaN(v) ? 0 : v
  })
}

function onStatusChange(s: StatementStatus) {
  emit('update:modelValue', { ...form.value, status: s })
}
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.form-input {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-input:focus {
  border-color: rgb(0, 122, 255);
}
.type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.type-btn {
  padding: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.type-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
</style>
