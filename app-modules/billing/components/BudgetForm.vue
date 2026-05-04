<template>
  <div class="form-body">
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
      <div class="label-row">
        <label class="form-label">分类</label>
        <button
          type="button"
          class="quick-add-toggle"
          @click="toggleQuickAdd"
        >
          <Icon
            :name="showQuickAdd ? 'solar:close-circle-linear' : 'solar:add-circle-linear'"
            size="14"
          />
          {{ showQuickAdd ? '取消' : '新增分类' }}
        </button>
      </div>
      <select v-model="form.categoryId" class="form-select">
        <option value="">请选择</option>
        <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div v-if="showQuickAdd" class="quick-add-row">
        <input
          ref="quickAddInputRef"
          v-model="quickAddName"
          class="form-input quick-add-input"
          type="text"
          placeholder="新分类名称（回车确认）"
          @keyup.enter.prevent="submitQuickAdd"
          @keyup.esc.prevent="cancelQuickAdd"
        />
        <button
          type="button"
          class="quick-add-confirm"
          :disabled="!quickAddName.trim()"
          @click="submitQuickAdd"
        >
          添加
        </button>
      </div>
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
import type { BudgetFormData, BillCategory } from '~/types/bill'

const props = defineProps<{
  modelValue: BudgetFormData
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BudgetFormData): void
  (e: 'quick-add-category', name: string): void
}>()

const cycleOptions = [
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

const showQuickAdd = ref(false)
const quickAddName = ref('')
const quickAddInputRef = ref<HTMLInputElement | null>(null)

async function toggleQuickAdd() {
  showQuickAdd.value = !showQuickAdd.value
  if (showQuickAdd.value) {
    await nextTick()
    quickAddInputRef.value?.focus()
  } else {
    quickAddName.value = ''
  }
}

function submitQuickAdd() {
  const name = quickAddName.value.trim()
  if (!name) return
  emit('quick-add-category', name)
  quickAddName.value = ''
  showQuickAdd.value = false
}

function cancelQuickAdd() {
  showQuickAdd.value = false
  quickAddName.value = ''
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.quick-add-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 12px;
  cursor: pointer;
}
.quick-add-toggle:hover {
  background: rgba(0, 122, 255, 0.08);
}
.quick-add-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.quick-add-input {
  flex: 1;
}
.quick-add-confirm {
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.quick-add-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
