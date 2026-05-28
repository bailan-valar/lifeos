<template>
  <div class="week-grid-container">
    <!-- 时间轴 -->
    <div ref="timeAxisRef" class="time-axis">
      <!-- 预留空白与星期标题行对齐 -->
      <div class="time-axis-header-spacer" />
      <div
        v-for="slot in timeSlots"
        :key="slot.value"
        class="time-slot"
      >
        {{ slot.label }}
      </div>
    </div>

    <!-- 日历网格 -->
    <div class="calendar-grid">
      <!-- 星期标题行 -->
      <div ref="dayHeadersWrapperRef" class="day-headers-wrapper">
        <div ref="dayHeadersRef" class="day-headers">
          <div
            v-for="(column, index) in weekColumns"
            :key="column.dateStr"
            class="day-header"
            :class="{ 'is-today': column.isToday }"
          >
            <div class="day-name">{{ column.dayName }}</div>
            <div class="day-number">{{ column.dayNumber }}</div>
          </div>
        </div>
      </div>

      <!-- 网格主体 -->
      <div ref="gridBodyRef" class="grid-body" @scroll="syncScroll">
        <!-- 背景网格 -->
        <div class="grid-background">
          <div class="day-columns">
            <div
              v-for="(column, index) in weekColumns"
              :key="column.dateStr"
              class="day-column-bg"
              :class="{ 'is-today': column.isToday }"
            >
              <div
                v-for="slot in timeSlots"
                :key="slot.value"
                class="time-cell"
                @click="$emit('clickCell', { dateStr: column.dateStr, timeSlot: slot })"
              />

              <!-- 时间线（仅在今天的列显示） -->
              <div
                v-if="currentTimeLinePosition !== null && index === todayColumnIndex"
                class="current-time-line"
                :style="{ top: currentTimeLinePosition + 'px' }"
              >
                <div class="time-dot" />
              </div>
            </div>
          </div>

          <!-- 任务层 -->
          <div class="tasks-layer">
            <div
              v-for="column in weekColumns"
              :key="column.dateStr"
              class="day-tasks"
            >
              <div
                v-for="task in column.timedTasks"
                :key="task.id"
                class="grid-task"
                :class="{
                  'completed': task.completed,
                  'has-overlap': task.leftOffset !== undefined
                }"
                :style="getTaskStyle(task)"
                @click="$emit('clickTask', task)"
              >
                <div class="task-content">
                  <button
                    class="task-checkbox"
                    @click.stop="$emit('toggleTask', task.id)"
                  >
                    <Icon
                      :name="task.completed ? SOLAR_ICONS.status.success : SOLAR_ICONS.status.pending"
                      :size="12"
                    />
                  </button>
                  <div class="task-info">
                    <div class="task-text">{{ task.text }}</div>
                    <div class="task-time">{{ formatTaskTime(task) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { TimeSlot, DayColumn, GridTask } from '~/composables/useTodoWeekView'

interface Props {
  timeSlots: TimeSlot[]
  weekColumns: DayColumn[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleTask: [id: string]
  clickTask: [task: GridTask]
  clickCell: [data: { dateStr: string; timeSlot: TimeSlot }]
}>()

const rowHeight = 36 // 每行高度（像素）

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 计算当前时间线位置
const currentTimeLinePosition = computed(() => {
  const now = new Date()
  const todayStr = formatDateLocal(now)

  // 检查今天是否在显示范围内
  const todayColumn = props.weekColumns.find(c => c.dateStr === todayStr)
  if (!todayColumn) return null

  // 计算当前分钟数
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 找到第一个时间槽
  if (props.timeSlots.length === 0) return null
  const firstSlot = props.timeSlots[0]
  const startMinutes = firstSlot.hour * 60 + firstSlot.minute

  // 计算相对位置
  const relativeMinutes = currentMinutes - startMinutes
  if (relativeMinutes < 0) return null

  const position = (relativeMinutes / 30) * rowHeight // 30分钟粒度

  return position
})

// 计算当前时间线所在的列索引
const todayColumnIndex = computed(() => {
  const now = new Date()
  const todayStr = formatDateLocal(now)
  return props.weekColumns.findIndex(c => c.dateStr === todayStr)
})

// 获取任务样式
function getTaskStyle(task: GridTask): {
  top: string
  height: string
  backgroundColor: string
  left?: string
  width?: string
} {
  const top = task.startRow * rowHeight
  const height = task.rowSpan * rowHeight - 2 // -2 用于留出间隙

  const style = {
    top: top + 'px',
    height: height + 'px',
    backgroundColor: task.color
  } as {
    top: string
    height: string
    backgroundColor: string
    left?: string
    width?: string
  }

  if (task.leftOffset !== undefined && task.widthPercent !== undefined) {
    style.left = task.leftOffset + '%'
    style.width = task.widthPercent + '%'
  }

  // 🐛 调试：输出任务样式信息（仅在首次渲染时）
  if (!task._debugged) {
    console.log('[WeekViewGrid] 任务样式:', {
      text: task.text,
      startRow: task.startRow,
      rowSpan: task.rowSpan,
      top: style.top,
      height: style.height,
      backgroundColor: style.backgroundColor
    })
    ;(task as any)._debugged = true
  }

  return style
}

// 格式化任务时间
function formatTaskTime(task: GridTask): string {
  // 检查是否有时间信息
  const hasStartTime = task.startDate && task.startDate.includes('T')
  const hasEndTime = task.dueDate && task.dueDate.includes('T')

  if (!hasStartTime) return ''

  const startTime = task.startDate!.split('T')[1]?.slice(0, 5) || ''
  if (hasEndTime && task.dueDate) {
    const endTime = task.dueDate.split('T')[1]?.slice(0, 5) || ''
    return `${startTime} - ${endTime}`
  }
  return startTime
}

// 滚动同步
const timeAxisRef = ref<HTMLElement>()
const gridBodyRef = ref<HTMLElement>()
const dayHeadersWrapperRef = ref<HTMLElement>()
const dayHeadersRef = ref<HTMLElement>()

function syncScroll(e: Event) {
  const currentTarget = e.currentTarget as HTMLElement
  if (timeAxisRef.value) {
    // 同步垂直滚动到时间轴
    timeAxisRef.value.scrollTop = currentTarget.scrollTop
  }
  // 同步水平滚动到星期标题
  if (dayHeadersWrapperRef.value) {
    dayHeadersWrapperRef.value.scrollLeft = currentTarget.scrollLeft
  }
}

// 同步列宽
function syncColumnWidths() {
  if (!gridBodyRef.value || !dayHeadersRef.value) return

  requestAnimationFrame(() => {
    const dayColumns = gridBodyRef.value!.querySelectorAll<HTMLElement>('.day-column-bg')
    const dayHeaders = dayHeadersRef.value!.querySelectorAll<HTMLElement>('.day-header')

    const widths: number[] = []
    dayColumns.forEach((col, index) => {
      const width = col.offsetWidth
      widths.push(width)
      if (dayHeaders[index]) {
        dayHeaders[index].style.width = width + 'px'
      }
    })

    // 通知其他组件更新列宽
    window.dispatchEvent(new CustomEvent('todo-week-column-widths', { detail: widths }))
    window.dispatchEvent(new Event('todo-week-sync-columns'))
  })
}

// 同步时间轴头部空白区域高度
function syncHeaderHeight() {
  if (!dayHeadersWrapperRef.value || !timeAxisRef.value) return

  const spacer = timeAxisRef.value.querySelector<HTMLElement>('.time-axis-header-spacer')
  if (!spacer) return

  const headerHeight = dayHeadersWrapperRef.value.offsetHeight
  spacer.style.height = headerHeight + 'px'
}

// 每分钟更新当前时间线
const { pause, resume } = useIntervalFn(() => {
  currentTimeLinePosition.value
}, 60000)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resume()
  nextTick(() => {
    syncColumnWidths()
    syncHeaderHeight()
  })
  window.addEventListener('resize', () => {
    syncColumnWidths()
    syncHeaderHeight()
  })

  if (gridBodyRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncColumnWidths()
      syncHeaderHeight()
    })
    resizeObserver.observe(gridBodyRef.value)
  }

  // 监听星期标题行高度变化
  if (dayHeadersRef.value) {
    const headerResizeObserver = new ResizeObserver(() => {
      syncHeaderHeight()
    })
    headerResizeObserver.observe(dayHeadersRef.value)
  }
})

watch(() => props.weekColumns, (newColumns) => {
  // 🐛 调试：输出列变化信息
  console.log('[WeekViewGrid] 列数据更新:', {
    总列数: newColumns.length,
    各列任务: newColumns.map(col => ({
      date: col.dateStr,
      allDay: col.allDayTasks.length,
      timed: col.timedTasks.length
    }))
  })

  // 输出定时任务的详细信息
  newColumns.forEach((col, colIndex) => {
    if (col.timedTasks.length > 0) {
      console.log(`[WeekViewGrid] 列 ${colIndex} (${col.dateStr}) 定时任务:`, col.timedTasks.map(t => ({
        text: t.text,
        startRow: t.startRow,
        rowSpan: t.rowSpan,
        top: `${t.startRow * rowHeight}px`,
        height: `${t.rowSpan * rowHeight}px`
      })))
    }
  })

  nextTick(() => {
    syncColumnWidths()
    syncHeaderHeight()
  })
}, { deep: true })

onUnmounted(() => {
  pause()
  window.removeEventListener('resize', syncColumnWidths)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.week-grid-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 时间轴 */
.time-axis {
  width: 50px;
  flex-shrink: 0;
  border-right: 1px solid rgba(60, 60, 67, 0.1);
  background: rgba(255, 255, 255, 0.2);
  overflow-y: auto;
  overflow-x: hidden;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* 确保即使没有滚动条也预留空间 */
  scrollbar-gutter: stable;
}

.time-axis::-webkit-scrollbar {
  display: none;
}

.time-axis-header-spacer {
  flex-shrink: 0;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(60, 60, 67, 0.05);
}

.time-slot {
  height: 36px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 3px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
  border-bottom: 1px solid rgba(60, 60, 67, 0.05);
  box-sizing: border-box;
}

/* 日历网格 */
.calendar-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 星期标题 */
.day-headers-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.day-headers-wrapper::-webkit-scrollbar {
  display: none;
}

.day-headers {
  display: flex;
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  background: rgba(255, 255, 255, 0.3);
}

.day-header {
  flex-shrink: 0;
  padding: 8px 6px;
  text-align: center;
  border-right: 1px solid rgba(60, 60, 67, 0.06);
  box-sizing: border-box;
}

.day-header:last-child {
  border-right: none;
}

.day-header.is-today {
  background: rgba(0, 122, 255, 0.08);
}

.day-name {
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
}

.day-number {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-top: 2px;
}

.day-header.is-today .day-number {
  color: rgb(0, 122, 255);
}

/* 网格主体 */
.grid-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

.grid-background {
  position: relative;
  min-height: 100%;
}

.day-columns {
  display: flex;
}

.day-column-bg {
  flex: 1;
  min-width: 0;
  border-right: 1px solid rgba(60, 60, 67, 0.06);
  position: relative;
  box-sizing: border-box;
}

.day-column-bg:last-child {
  border-right: none;
}

.day-column-bg.is-today {
  background: rgba(0, 122, 255, 0.02);
}

.time-cell {
  height: 36px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.04);
  cursor: pointer;
  transition: background-color 0.15s ease;
  box-sizing: border-box;
}

.time-cell:hover {
  background-color: rgba(0, 122, 255, 0.06);
}

/* 当前时间线 */
.current-time-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgb(255, 59, 48);
  z-index: 10;
  pointer-events: none;
}

.time-dot {
  position: absolute;
  left: 0;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(255, 59, 48);
}

/* 任务层 */
.tasks-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
}

.day-tasks {
  flex: 1;
  min-width: 0;
  position: relative;
}

.grid-task {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  overflow: hidden;
}

.grid-task:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.grid-task.completed {
  opacity: 0.6;
}

.grid-task.completed .task-text {
  text-decoration: line-through;
}

.task-content {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  height: 100%;
}

.task-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  margin-top: 1px;
}

.task-info {
  flex: 1;
  overflow: hidden;
}

.task-text {
  font-size: 12px;
  font-weight: 500;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

/* 滚动条样式 */
.grid-body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.grid-body::-webkit-scrollbar-track {
  background: transparent;
}

.grid-body::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 4px;
}

.grid-body::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .time-axis {
    background: rgba(255, 255, 255, 0.08);
    border-right-color: rgba(255, 255, 255, 0.1);
  }

  .time-slot {
    color: rgba(255, 255, 255, 0.6);
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }

  .time-axis-header-spacer {
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }

  .day-headers {
    background: rgba(255, 255, 255, 0.08);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .day-header {
    border-right-color: rgba(255, 255, 255, 0.06);
  }

  .day-name {
    color: rgba(255, 255, 255, 0.6);
  }

  .day-number {
    color: rgba(255, 255, 255, 0.85);
  }

  .day-column-bg {
    border-right-color: rgba(255, 255, 255, 0.06);
  }

  .time-cell {
    border-bottom-color: rgba(255, 255, 255, 0.04);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .time-axis {
    width: 50px;
  }

  .time-slot {
    font-size: 10px;
  }
}
</style>
