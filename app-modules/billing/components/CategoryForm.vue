<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">分类名称</label>
      <input v-model="form.name" class="form-input" type="text" placeholder="输入分类名称" />
    </div>
    <div class="form-group">
      <label class="form-label">所属类型</label>
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
      <label class="form-label">父分类</label>
      <select v-model="form.parentId" class="form-select">
        <option value="">无（顶级分类）</option>
        <option
          v-for="cat in availableParents"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryFormData, CategoryType, BillCategory } from '~/types/bill'

const props = defineProps<{
  modelValue: CategoryFormData
  categories: BillCategory[]
  excludeId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CategoryFormData): void
}>()

const typeOptions = [
  { value: 'income' as CategoryType, label: '收入' },
  { value: 'expense' as CategoryType, label: '支出' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const availableParents = computed(() =>
  props.categories.filter(c => c.type === form.value.type && c.id !== props.excludeId)
)
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
