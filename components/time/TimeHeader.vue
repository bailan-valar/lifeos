<template>
  <div class="time-header">
    <div class="view-tabs">
      <button
        v-for="v in views"
        :key="v.value"
        class="tab-btn"
        :class="{ active: modelValue === v.value }"
        @click="$emit('update:modelValue', v.value)"
      >
        {{ v.label }}
      </button>
    </div>

    <div class="nav-controls">
      <button class="nav-btn" type="button" @click="onPrev">
        <Icon name="solar:alt-arrow-left-linear" size="18" />
      </button>
      <span class="nav-label">{{ navLabel }}</span>
      <button class="nav-btn" type="button" @click="onNext">
        <Icon name="solar:alt-arrow-right-linear" size="18" />
      </button>
      <button
        v-if="modelValue === 'day'"
        class="expand-btn"
        type="button"
        @click="$emit('toggle-calendar')"
      >
        <Icon
          :name="calendarExpanded ? 'solar:minimize-square-linear' : 'solar:maximize-square-linear'"
          size="18"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export type TimeView = 'year' | 'month' | 'week' | 'day'

const props = defineProps<{
  modelValue: TimeView
  currentDate: Date
  calendarExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: TimeView): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'toggle-calendar'): void
}>()

const views = [
  { value: 'year' as TimeView, label: '年' },
  { value: 'month' as TimeView, label: '月' },
  { value: 'week' as TimeView, label: '周' },
  { value: 'day' as TimeView, label: '日' },
]

function onPrev() {
  emit('prev')
}

function onNext() {
  emit('next')
}

const navLabel = computed(() => {
  const d = props.currentDate
  const year = d.getFullYear()
  const month = d.getMonth() + 1

  switch (props.modelValue) {
    case 'year':
      return `${year}年`
    case 'month':
      return `${year}年${month}月`
    case 'week': {
      const start = getWeekStart(d)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const format = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`
      return `${format(start)} - ${format(end)}`
    }
    case 'day':
      return `${year}年${month}月`
    default:
      return ''
  }
})

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}
</script>

<style scoped>
.time-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.view-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
}

.tab-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: rgba(60, 60, 67, 0.85);
}

.tab-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn,
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover,
.expand-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.92);
}

.nav-label {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  min-width: 100px;
  text-align: center;
  white-space: nowrap;
}
</style>
