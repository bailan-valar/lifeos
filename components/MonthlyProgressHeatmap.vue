<template>
  <div class="monthly-progress-heatmap">
    <div class="heatmap-header">
      <h3 class="headline">每日进度</h3>
      <div class="heatmap-legend">
        <div class="legend-scale">
          <div class="legend-label caption1 liquid-text-tertiary">少</div>
          <div class="legend-bars">
            <div class="legend-bar level-0"></div>
            <div class="legend-bar level-1"></div>
            <div class="legend-bar level-2"></div>
            <div class="legend-bar level-3"></div>
            <div class="legend-bar level-4"></div>
          </div>
          <div class="legend-label caption1 liquid-text-tertiary">多</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="heatmapData.length === 0" class="empty-state">
      <Icon name="solar:calendar-linear" size="32" class="empty-icon" />
      <p class="body liquid-text-secondary">暂无进度数据</p>
    </div>

    <div v-else class="heatmap-container">
      <!-- 月份导航 -->
      <div class="month-nav">
        <button @click="prevMonth" class="liquid-glass-button nav-btn" :disabled="!canPrevMonth">
          <Icon name="solar:alt-arrow-left-linear" size="16" />
        </button>
        <span class="month-label headline">{{ currentMonthLabel }}</span>
        <button @click="nextMonth" class="liquid-glass-button nav-btn" :disabled="!canNextMonth">
          <Icon name="solar:alt-arrow-right-linear" size="16" />
        </button>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-grid">
        <div class="weekday-labels">
          <div v-for="day in weekdayLabels" :key="day" class="weekday-label caption2">
            {{ day }}
          </div>
        </div>
        <div class="calendar-days">
          <div
            v-for="day in calendarDays"
            :key="day.dateKey"
            class="calendar-day"
            :class="{ 'has-progress': day.amount > 0 }"
            :style="{ backgroundColor: day.amount > 0 ? getHeatmapColor(day.amount, day.maxAmount) : 'transparent' }"
            :title="getTooltipText(day)"
          >
            <span class="day-number caption2">{{ day.dayNumber }}</span>
            <span v-if="day.amount > 0" class="day-amount caption2">{{ day.amount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProgressLog } from '~/types/goal'
import { formatDate } from '~/composables/useGoalProgress'

const props = defineProps<{
  goalId: string
  progressLogs: ProgressLog[]
  loading?: boolean
}>()

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']
const currentViewDate = ref(new Date())

// 计算热力图数据
const heatmapData = computed(() => {
  const map = new Map<string, number>()

  // 按日期聚合进度量
  for (const log of props.progressLogs) {
    const date = new Date(log.date)
    const dateKey = formatDate(date, 'short')
    map.set(dateKey, (map.get(dateKey) || 0) + log.amount)
  }

  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
})

// 当前视图月份
const currentMonthLabel = computed(() => {
  return `${currentViewDate.value.getFullYear()}年${currentViewDate.value.getMonth() + 1}月`
})

const canPrevMonth = computed(() => {
  const earliestDate = props.progressLogs[0]?.date
  if (!earliestDate) return false
  const earliest = new Date(earliestDate)
  const viewYear = currentViewDate.value.getFullYear()
  const viewMonth = currentViewDate.value.getMonth()
  // 允许查看进度日志所在月份及之后的月份
  return viewYear > earliest.getFullYear()
    || (viewYear === earliest.getFullYear() && viewMonth > earliest.getMonth())
})

const canNextMonth = computed(() => {
  const latestDate = props.progressLogs[props.progressLogs.length - 1]?.date
  if (!latestDate) return false
  const latest = new Date(latestDate)
  const viewYear = currentViewDate.value.getFullYear()
  const viewMonth = currentViewDate.value.getMonth()
  // 允许查看进度日志所在月份及之前的月份
  return viewYear < latest.getFullYear()
    || (viewYear === latest.getFullYear() && viewMonth < latest.getMonth())
})

// 生成日历网格
const calendarDays = computed(() => {
  const year = currentViewDate.value.getFullYear()
  const month = currentViewDate.value.getMonth()

  // 获取月份的第一天和最后一天
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // 获取第一天是星期几（0=周日）
  const firstDayOfWeek = firstDay.getDay()

  const days: Array<{
    dateKey: string
    dayNumber: number
    amount: number
    maxAmount: number
    isCurrentMonth: boolean
  }> = []

  // 添加上个月的空白日期
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({
      dateKey: '',
      dayNumber: 0,
      amount: 0,
      maxAmount: 0,
      isCurrentMonth: false
    })
  }

  // 计算最大进度量（用于颜色映射）
  const monthData = heatmapData.value.filter(d => {
    const date = new Date(d.date)
    return date.getMonth() === month && date.getFullYear() === year
  })

  const maxAmount = Math.max(...monthData.map(d => d.amount), 1)

  // 添加当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateKey = formatDate(date.toISOString(), 'short')
    const amount = heatmapData.value.find(d => d.date === dateKey)?.amount || 0

    days.push({
      dateKey,
      dayNumber: day,
      amount,
      maxAmount,
      isCurrentMonth: true
    })
  }

  return days
})

// 获取热力图颜色
function getHeatmapColor(amount: number, maxAmount: number): string {
  const ratio = amount / maxAmount

  if (ratio === 0) return 'transparent'
  if (ratio < 0.2) return 'rgba(52, 199, 89, 0.2)'
  if (ratio < 0.4) return 'rgba(52, 199, 89, 0.4)'
  if (ratio < 0.6) return 'rgba(52, 199, 89, 0.6)'
  if (ratio < 0.8) return 'rgba(52, 199, 89, 0.8)'
  return 'rgba(52, 199, 89, 1)'
}

// 获取提示文本
function getTooltipText(day: any): string {
  if (day.amount === 0) return `${day.dayNumber}日：无记录`
  return `${day.dayNumber}日：${day.amount} ${day.maxAmount > 0 ? `(${((day.amount / day.maxAmount) * 100).toFixed(0)}%)` : ''}`
}

// 月份导航
function prevMonth() {
  const newDate = new Date(currentViewDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentViewDate.value = newDate
}

function nextMonth() {
  const newDate = new Date(currentViewDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentViewDate.value = newDate
}
</script>

<style scoped>
.monthly-progress-heatmap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.heatmap-header h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-scale {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-bars {
  display: flex;
  gap: 2px;
}

.legend-bar {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-bar.level-0 {
  background: rgba(52, 199, 89, 0.2);
}

.legend-bar.level-1 {
  background: rgba(52, 199, 89, 0.4);
}

.legend-bar.level-2 {
  background: rgba(52, 199, 89, 0.6);
}

.legend-bar.level-3 {
  background: rgba(52, 199, 89, 0.8);
}

.legend-bar.level-4 {
  background: rgba(52, 199, 89, 1);
}

.loading-state,
.empty-state {
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.heatmap-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.month-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--liquid-bg-thin);
  border-radius: var(--liquid-radius-button);
}

.month-label {
  min-width: 100px;
  text-align: center;
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.nav-btn {
  padding: 6px;
  min-width: 32px;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.weekday-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.weekday-label {
  text-align: center;
  padding: 8px 0;
  color: var(--liquid-text-tertiary);
  font-weight: 500;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.calendar-day:hover {
  transform: scale(1.05);
  z-index: 1;
}

.calendar-day.has-progress {
  background: rgba(52, 199, 89, 0.1);
  border: 0.5px solid rgba(52, 199, 89, 0.3);
}

.day-number {
  color: var(--liquid-text-primary);
  font-weight: 500;
}

.day-amount {
  color: rgb(52, 199, 89);
  font-weight: 600;
  font-size: 10px;
}

/* 响应式 */
@media (max-width: 640px) {
  .calendar-day {
    border-radius: 4px;
  }

  .day-amount {
    font-size: 9px;
  }
}
</style>
