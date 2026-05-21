<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">目标名称 <span class="required">*</span></label>
      <input
        v-model="form.title"
        type="text"
        class="form-input"
        placeholder="例如：每天阅读 30 页"
      />
    </div>

    <div class="form-group">
      <label class="form-label">描述</label>
      <textarea
        v-model="form.description"
        class="form-textarea"
        rows="2"
        placeholder="可选：补充说明目标背景或意义"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">目标量 <span class="required">*</span></label>
        <input
          v-model.number="form.target"
          type="number"
          class="form-input"
          placeholder="例如：3000"
          min="0"
        />
      </div>
      <div class="form-group">
        <label class="form-label">单位 <span class="required">*</span></label>
        <input
          v-model="form.unit"
          type="text"
          class="form-input"
          placeholder="例如：页、次、km"
        />
      </div>
    </div>

    <div v-if="isEditing" class="form-group">
      <label class="form-label">当前进度</label>
      <input
        v-model.number="form.currentProgress"
        type="number"
        class="form-input"
        placeholder="0"
        min="0"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">开始日期 <span class="required">*</span></label>
        <input
          v-model="form.startDate"
          type="date"
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label class="form-label">结束日期 <span class="required">*</span></label>
        <input
          v-model="form.endDate"
          type="date"
          class="form-input"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">目标类型</label>
        <div class="type-selector">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            type="button"
            class="type-btn"
            :class="{ active: form.type === opt.value }"
            @click="form.type = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">优先级</label>
        <div class="type-selector">
          <button
            v-for="opt in priorityOptions"
            :key="opt.value"
            type="button"
            class="type-btn"
            :class="{ active: form.priority === opt.value }"
            @click="form.priority = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">状态</label>
        <div class="type-selector">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="type-btn"
            :class="{ active: form.status === opt.value }"
            @click="form.status = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="dateError" class="form-hint warn">{{ dateError }}</div>
  </div>
</template>

<script setup lang="ts">
import type { GoalFormData, GoalType, GoalPriority, GoalStatus } from '~/types/goal'

const props = defineProps<{
  modelValue: GoalFormData
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: GoalFormData): void
}>()

const typeOptions: { value: GoalType; label: string }[] = [
  { value: 'short_term', label: '短期' },
  { value: 'long_term', label: '长期' },
  { value: 'habit', label: '习惯' },
  { value: 'project', label: '项目' }
]

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

const statusOptions: { value: GoalStatus; label: string }[] = [
  { value: 'pending', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const dateError = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return ''
  if (form.value.startDate >= form.value.endDate) {
    return '结束日期必须晚于开始日期'
  }
  return ''
})
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
.form-label .required {
  color: rgb(255, 59, 48);
  margin-left: 2px;
}
.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  transition: border-color 0.15s ease;
}
.form-input:focus,
.form-textarea:focus {
  border-color: rgb(0, 122, 255);
}
.form-textarea {
  resize: vertical;
  min-height: 60px;
}
.type-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.type-btn {
  flex: 1;
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 60px;
}
.type-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.type-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.8);
}
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.form-hint.warn {
  color: rgb(255, 59, 48);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
