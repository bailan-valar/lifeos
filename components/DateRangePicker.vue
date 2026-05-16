<template>
  <div class="date-range-picker liquid-glass-card">
    <div class="date-inputs">
      <div class="date-field">
        <label class="caption1 liquid-text-secondary">开始日期</label>
        <input
          :value="startDate"
          type="date"
          class="liquid-glass-input"
          @input="onStartDateChange"
        />
      </div>
      <div class="date-separator">
        <Icon name="solar:alt-arrow-right-linear" size="16" />
      </div>
      <div class="date-field">
        <label class="caption1 liquid-text-secondary">结束日期</label>
        <input
          :value="endDate"
          type="date"
          class="liquid-glass-input"
          @input="onEndDateChange"
        />
      </div>
    </div>
    <div v-if="validationError" class="error-message caption2 text-ios-red">
      {{ validationError }}
    </div>
    <div v-else class="date-summary caption2 liquid-text-secondary">
      共 {{ totalDays }} 天（{{ totalMonths }} 个月）
    </div>
  </div>
</template>

<script setup lang="ts">
import { validateDateRange } from '~/composables/useGoalProgress'

const props = defineProps<{
  startDate: string
  endDate: string
}>()

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
}>()

const validationError = ref('')

const totalDays = computed(() => {
  if (!props.startDate || !props.endDate) return 0
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
})

const totalMonths = computed(() => {
  if (!props.startDate || !props.endDate) return 0
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return Math.abs(months)
})

function onStartDateChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newStartDate = target.value

  if (props.endDate) {
    const validation = validateDateRange(newStartDate, props.endDate)
    if (!validation.valid) {
      validationError.value = validation.error || ''
      return
    }
  }

  validationError.value = ''
  emit('update:startDate', newStartDate)
}

function onEndDateChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newEndDate = target.value

  if (props.startDate) {
    const validation = validateDateRange(props.startDate, newEndDate)
    if (!validation.valid) {
      validationError.value = validation.error || ''
      return
    }
  }

  validationError.value = ''
  emit('update:endDate', newEndDate)
}

// 清除验证错误当日期变化时
watch(() => [props.startDate, props.endDate], () => {
  validationError.value = ''
})
</script>

<style scoped>
.date-range-picker {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-inputs {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.date-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-field label {
  font-size: 12px;
  font-weight: 500;
}

.date-separator {
  display: flex;
  align-items: center;
  padding-bottom: 10px;
  color: var(--liquid-text-tertiary);
}

.error-message {
  padding: 8px 12px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: var(--liquid-radius-input);
}

.date-summary {
  text-align: center;
  padding: 6px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .date-inputs {
    flex-direction: column;
    gap: 8px;
  }

  .date-separator {
    transform: rotate(90deg);
    padding: 0;
  }
}
</style>
