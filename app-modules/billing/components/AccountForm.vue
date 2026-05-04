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
          @click="onTypeChange(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
    <div v-if="form.type === 'personal'" class="form-group">
      <label class="form-label">资金账户形态</label>
      <div class="subtype-grid">
        <button
          v-for="s in subtypeOptions"
          :key="s.value"
          type="button"
          class="type-btn"
          :class="{ active: (form.subtype || 'cash') === s.value }"
          @click="onSubtypeChange(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
    <template v-if="form.type === 'personal' && form.subtype === 'credit_card'">
      <div class="form-group">
        <label class="form-label">信用额度</label>
        <input
          :value="form.creditLimit ?? 0"
          class="form-input"
          type="number"
          min="0"
          step="0.01"
          @input="onCreditLimitInput(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">账单日（每月 1-28 日）</label>
          <input
            :value="form.billingDay ?? 1"
            class="form-input"
            type="number"
            min="1"
            max="28"
            step="1"
            @input="onBillingDayInput(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="form-group">
          <label class="form-label">还款日（每月 1-28 日）</label>
          <input
            :value="form.repaymentDay ?? 1"
            class="form-input"
            type="number"
            min="1"
            max="28"
            step="1"
            @input="onRepaymentDayInput(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </template>
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
import type { AccountFormData, AccountType, AccountSubtype } from '~/types/bill'

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

const subtypeOptions: Array<{ value: AccountSubtype; label: string }> = [
  { value: 'cash', label: '现金' },
  { value: 'debit_card', label: '储蓄卡' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'online_account', label: '网络账户' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function clampDay(n: number): number {
  if (isNaN(n)) return 1
  return Math.max(1, Math.min(28, Math.floor(n)))
}

function onTypeChange(t: AccountType) {
  if (t === 'personal') {
    emit('update:modelValue', {
      ...form.value,
      type: t,
      subtype: form.value.subtype || 'cash'
    })
  } else {
    const next = { ...form.value, type: t }
    delete next.subtype
    delete next.creditLimit
    delete next.billingDay
    delete next.repaymentDay
    emit('update:modelValue', next)
  }
}

function onSubtypeChange(s: AccountSubtype) {
  const next: AccountFormData = { ...form.value, subtype: s }
  if (s === 'credit_card') {
    next.creditLimit = typeof form.value.creditLimit === 'number' ? form.value.creditLimit : 0
    next.billingDay = clampDay(form.value.billingDay ?? 1)
    next.repaymentDay = clampDay(form.value.repaymentDay ?? 1)
  } else {
    delete next.creditLimit
    delete next.billingDay
    delete next.repaymentDay
  }
  emit('update:modelValue', next)
}

function onCreditLimitInput(raw: string) {
  const v = parseFloat(raw)
  emit('update:modelValue', {
    ...form.value,
    creditLimit: isNaN(v) ? 0 : v
  })
}

function onBillingDayInput(raw: string) {
  const v = parseInt(raw, 10)
  emit('update:modelValue', {
    ...form.value,
    billingDay: clampDay(v)
  })
}

function onRepaymentDayInput(raw: string) {
  const v = parseInt(raw, 10)
  emit('update:modelValue', {
    ...form.value,
    repaymentDay: clampDay(v)
  })
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
.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group {
  flex: 1;
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
.subtype-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
