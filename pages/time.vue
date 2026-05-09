<template>
  <div class="time-page">
    <TimeHeader
      v-model="currentView"
      :current-date="currentDate"
      :calendar-expanded="calendarExpanded"
      @prev="onPrev"
      @next="onNext"
      @toggle-calendar="calendarExpanded = !calendarExpanded"
    />

    <div class="time-content">
      <YearView v-if="currentView === 'year'" :year="currentDate.getFullYear()" />
      <MonthView
        v-else-if="currentView === 'month'"
        :year="currentDate.getFullYear()"
        :month="currentDate.getMonth() + 1"
      />
      <WeekView v-else-if="currentView === 'week'" :week-start="weekStart" />
      <DayView
        v-else-if="currentView === 'day'"
        :date="selectedDate"
        :calendar-expanded="calendarExpanded"
        @select-date="selectedDate = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeHeader from '~/components/time/TimeHeader.vue'
import YearView from '~/components/time/YearView.vue'
import MonthView from '~/components/time/MonthView.vue'
import WeekView from '~/components/time/WeekView.vue'
import DayView from '~/components/time/DayView.vue'
import type { TimeView } from '~/components/time/TimeHeader.vue'

defineOptions({ name: 'TimePage' })

const currentView = ref<TimeView>('month')
const currentDate = ref(new Date())
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const calendarExpanded = ref(false)

const weekStart = computed(() => {
  const d = new Date(currentDate.value)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
})

// 日视图下，currentDate 改变时同步 selectedDate
watch(currentDate, (d) => {
  if (currentView.value === 'day') {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const lastDay = new Date(y, m, 0).getDate()
    const day = Math.min(new Date(selectedDate.value + 'T00:00:00').getDate(), lastDay)
    selectedDate.value = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
})

// 切换到日视图时，同步 selectedDate
watch(currentView, (v) => {
  if (v === 'day') {
    const d = currentDate.value
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = Math.min(new Date(selectedDate.value + 'T00:00:00').getDate(), new Date(y, m, 0).getDate())
    selectedDate.value = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
})

function onPrev() {
  const d = new Date(currentDate.value)
  switch (currentView.value) {
    case 'year':
      d.setFullYear(d.getFullYear() - 1)
      break
    case 'month':
      d.setMonth(d.getMonth() - 1)
      break
    case 'week':
      d.setDate(d.getDate() - 7)
      break
    case 'day':
      d.setMonth(d.getMonth() - 1)
      break
  }
  currentDate.value = d
}

function onNext() {
  const d = new Date(currentDate.value)
  switch (currentView.value) {
    case 'year':
      d.setFullYear(d.getFullYear() + 1)
      break
    case 'month':
      d.setMonth(d.getMonth() + 1)
      break
    case 'week':
      d.setDate(d.getDate() + 7)
      break
    case 'day':
      d.setMonth(d.getMonth() + 1)
      break
  }
  currentDate.value = d
}
</script>

<style scoped>
.time-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}

.time-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
