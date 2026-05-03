<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">账户名称</label>
      <input v-model="form.name" class="form-input" type="text" placeholder="如：现金、支付宝、张三" />
    </div>
    <div class="form-group">
      <label class="form-label">账户类型</label>
      <div class="type-selector">
        <button
          v-for="t in typeOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.type === t.value }"
          @click="form.type = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">币种</label>
      <select v-model="form.currency" class="form-select">
        <option value="CNY">CNY</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccountFormData, AccountType } from '~/types/bill'

const props = defineProps<{
  modelValue: AccountFormData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AccountFormData): void
}>()

const typeOptions = [
  { value: 'personal' as AccountType, label: '个人账户' },
  { value: 'other' as AccountType, label: '他人账户' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
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
.form-input,
.form-select {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-input:focus,
.form-select:focus {
  border-color: rgb(0, 122, 255);
}
.type-selector {
  display: flex;
  gap: 8px;
}
.type-btn {
  flex: 1;
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
