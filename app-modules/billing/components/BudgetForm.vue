<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">预算周期</label>
      <div class="type-grid">
        <button
          v-for="t in periodOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.period === t.value }"
          @click="form.period = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">分类</label>
      <select v-model="form.categoryId" class="form-select">
        <option value="">请选择</option>
        <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">年份</label>
      <input v-model.number="form.year" class="form-input" type="number" />
    </div>

    <div v-if="form.period === 'monthly'" class="form-group">
      <label class="form-label">月份</label>
      <select v-model.number="form.month" class="form-select">
        <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">预算金额</label>
      <input
        v-model.number="form.amount"
        class="form-input"
        type="number"
        step="0.01"
        placeholder="0.00"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BudgetFormData, BillCategory } from '~/types/bill'

const props = defineProps<{
  modelValue: BudgetFormData
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BudgetFormData): void
}>()

const periodOptions = [
  { value: 'monthly' as const, label: '月预算' },
  { value: 'yearly' as const, label: '年预算' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const expenseCategories = computed(() =>
  props.categories.filter(c => c.type === 'expense')
)

watch(() => form.value.period, (newPeriod) => {
  if (newPeriod === 'yearly') {
    form.value.month = null
  } else if (form.value.month === null) {
    form.value.month = new Date().getMonth() + 1
  }
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
.type-grid {
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
