<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">所属笔记</label>
      <select v-model="form.noteId" class="form-select">
        <option v-for="n in noteOptions" :key="n.id" :value="n.id">
          {{ '  '.repeat(n.level) }}{{ n.title }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">预算周期</label>
      <div class="type-grid">
        <button
          v-for="t in cycleOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.cycleType === t.value }"
          @click="form.cycleType = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">分类</label>
      <CategoryPicker
        v-model="form.categoryId"
        :categories="categories"
        type="expense"
        placeholder="请选择分类"
        @create="emit('create-category', $event)"
        @open-form="emit('open-category-form', $event)"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">生效年份</label>
        <input v-model.number="form.effectiveFromYear" class="form-input" type="number" />
      </div>
      <div class="form-group">
        <label class="form-label">生效月份</label>
        <select v-model.number="form.effectiveFromMonth" class="form-select">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
      </div>
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
import type { BudgetFormData, BillCategory, CategoryType } from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  modelValue: BudgetFormData
  categories: BillCategory[]
  noteOptions: NoteOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BudgetFormData): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string; defaultName?: string }): void
}>()

const cycleOptions = [
  { value: 'monthly' as const, label: '月预算' },
  { value: 'yearly' as const, label: '年预算' }
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
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
