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

    <!-- 手机端底部 Tab -->
    <nav v-if="isMobile" class="time-mobile-tabbar">
      <button
        v-for="v in views"
        :key="v.value"
        type="button"
        class="time-tab-item"
        :class="{ active: currentView === v.value }"
        @click="currentView = v.value"
      >
        <Icon :name="v.icon" size="20" />
        <span>{{ v.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { toLocalISO } from '~/services/db'
import TimeHeader from '~/components/time/TimeHeader.vue'
import YearView from '~/components/time/YearView.vue'
import MonthView from '~/components/time/MonthView.vue'
import WeekView from '~/components/time/WeekView.vue'
import DayView from '~/components/time/DayView.vue'
import type { TimeView } from '~/components/time/TimeHeader.vue'

defineOptions({ name: 'TimePage' })

const { isMobile } = useDevice()

const views = [
  { value: 'year' as TimeView, label: '年', icon: 'solar:calendar-linear' },
  { value: 'month' as TimeView, label: '月', icon: 'solar:calendar-date-linear' },
  { value: 'week' as TimeView, label: '周', icon: 'solar:calendar-mark-linear' },
  { value: 'day' as TimeView, label: '日', icon: 'solar:clock-circle-linear' },
]

const currentView = ref<TimeView>('month')
const currentDate = ref(new Date())
const selectedDate = ref(toLocalISO('date'))
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
  padding-bottom: calc(12px + 56px + env(safe-area-inset-bottom));
}

.time-mobile-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-shrink: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-top: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: var(--z-drawer);
  position: relative;
  overflow: hidden;
}

.time-mobile-tabbar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.time-tab-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;
}

.time-tab-item.active {
  color: rgb(0, 122, 255);
}

.time-tab-item:active {
  opacity: 0.7;
}
</style>
