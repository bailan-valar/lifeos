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
      <CategoryPicker
        v-model="form.parentId"
        :categories="categories"
        :type="form.type"
        placeholder="无（顶级分类）"
        clearable
        :exclude-id="excludeId"
      />
    </div>

    <div class="form-group">
      <IconPicker v-model="form.icon" :icons="presetIcons" label="图标" />
    </div>

    <div class="form-group">
      <label class="form-label">颜色</label>
      <div class="color-picker">
        <button
          v-for="color in presetColors"
          :key="color"
          type="button"
          class="color-option"
          :class="{ active: form.color === color }"
          :style="{ background: color }"
          @click="form.color = color"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryFormData, CategoryType, BillCategory } from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'
import IconPicker from '~/components/IconPicker.vue'

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

const presetIcons = [
  'solar:wallet-linear',
  'solar:card-linear',
  'solar:cart-linear',
  'solar:bag-linear',
  'solar:home-linear',
  'solar:kick-scooter-linear',
  'solar:cpu-linear',
  'solar:bolt-linear',
  'solar:heart-linear',
  'solar:star-linear',
  'solar:chef-hat-linear',
  'solar:cup-hot-linear',
  'solar:bus-linear',
  'solar:health-linear',
  'solar:book-linear',
  'solar:gift-linear'
]

const presetColors = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
  '#8E8E93'
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

/* ---------- 类型切换时自动清空不匹配的父分类 ---------- */
watch(() => form.value.type, (newType, oldType) => {
  if (!oldType || newType === oldType) return
  if (form.value.parentId) {
    const parent = props.categories.find(c => c.id === form.value.parentId)
    if (!parent || parent.type !== newType) {
      emit('update:modelValue', { ...form.value, parentId: '' })
    }
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
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.color-option {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.color-option:hover {
  transform: scale(1.1);
}
.color-option.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
}
</style>
