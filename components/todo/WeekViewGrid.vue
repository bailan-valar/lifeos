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
                :class="{ 'drag-over': dropTarget?.dateStr === column.dateStr && dropTarget?.timeSlot.value === slot.value }"
                @click="$emit('clickCell', { dateStr: column.dateStr, timeSlot: slot })"
                @dragover="(e) => handleDragOver(e, column.dateStr, slot)"
                @dragenter="(e) => console.log('[拖拽] dragenter 时间单元格:', column.dateStr, slot.label)"
                @drop="(e) => handleDrop(e, column.dateStr, slot)"
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
          <div class="tasks-layer" :class="{ 'is-dragging': isDragging }">
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
                  'has-overlap': task.leftOffset !== undefined,
                  'dragging': isDragging && draggedTask?.id === task.id,
                  'resizing': isResizing && resizingTask?.id === task.id
                }"
                :style="getTaskStyle(task)"
                :draggable="!isResizing"
                @click="handleTaskClick(task)"
                @dragstart="(e) => handleDragStart(task, e)"
                @dragend="handleDragEnd"
              >
                <!-- 顶部调整手柄 - 修改开始时间 -->
                <div
                  class="resize-handle resize-handle-top"
                  :class="{ 'active': resizeEdge === 'top' }"
                  @mousedown.stop="(e) => handleResizeStart(task, 'top', e)"
                  @touchstart.stop="(e) => handleResizeStart(task, 'top', e)"
                />

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

                <!-- 底部调整手柄 - 修改结束时间 -->
                <div
                  class="resize-handle resize-handle-bottom"
                  :class="{ 'active': resizeEdge === 'bottom' }"
                  @mousedown.stop="(e) => handleResizeStart(task, 'bottom', e)"
                  @touchstart.stop="(e) => handleResizeStart(task, 'bottom', e)"
                />
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
  timeStart?: number
  slotDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  timeStart: 8,
  slotDuration: 30
})

const emit = defineEmits<{
  toggleTask: [id: string]
  clickTask: [task: GridTask]
  clickCell: [data: { dateStr: string; timeSlot: TimeSlot }]
  dragStart: [task: GridTask, event: DragEvent]
  dragEnd: []
  dropTask: [data: { task: GridTask; newDateStr: string; newStartTime: string; newEndTime: string }]
  resizeTask: [data: { task: GridTask; newStartTime?: string; newEndTime?: string }]
}>()

const rowHeight = 36 // 每行高度（像素）

// 拖拽相关状态
const isDragging = ref(false)
const draggedTask = ref<GridTask | null>(null)
const dragPreview = ref<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
const dropTarget = ref<{ dateStr: string; timeSlot: TimeSlot } | null>(null)
// 拖拽时的预览时间
const dragPreviewTime = ref<{ startTime: string; endTime: string } | null>(null)

// 调整大小相关状态
const isResizing = ref(false)
const resizingTask = ref<GridTask | null>(null)
const resizeEdge = ref<'top' | 'bottom' | null>(null)
const resizeStartY = ref(0)
const resizeStartTop = ref(0)
const resizeStartHeight = ref(0)
const resizeStartTime = ref<{ minutes: number } | null>(null)
const resizeEndTime = ref<{ minutes: number } | null>(null)
// 临时存储调整后的时间（只在结束时提交）
const pendingNewStartTime = ref<string | null>(null)
const pendingNewEndTime = ref<string | null>(null)
// 标志：是否刚刚完成了调整操作（用于避免触发点击）
const justFinishedResize = ref(false)
// 用于跟踪正在更新数据的任务ID，防止闪回
const updatingTaskId = ref<string | null>(null)

// 开始拖拽
function handleDragStart(task: GridTask, event: DragEvent) {
  if (!(event.dataTransfer)) return
  console.log('[拖拽] 开始拖拽任务:', { id: task.id, text: task.text, startDate: task.startDate, dueDate: task.dueDate })
  isDragging.value = true
  draggedTask.value = task

  // 设置拖拽数据
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)

  // 触发事件
  emit('dragStart', task, event)
}

// 拖拽中
function handleDragOver(event: DragEvent, dateStr: string, timeSlot?: TimeSlot) {
  console.log('[拖拽] handleDragOver 被调用:', { dateStr, timeSlot: timeSlot?.label })
  event.preventDefault()
  if (!(event.dataTransfer)) {
    console.log('[拖拽] 没有 dataTransfer')
    return
  }

  event.dataTransfer.dropEffect = 'move'

  // 计算拖拽位置对应的时间槽
  if (timeSlot) {
    console.log('[拖拽] 悬停在时间槽:', { dateStr, timeSlot: timeSlot.label })
    dropTarget.value = { dateStr, timeSlot }

    // 计算拖拽时的预览时间
    if (draggedTask.value) {
      const startTime = `${String(timeSlot.hour).padStart(2, '0')}:${String(timeSlot.minute).padStart(2, '0')}`

      // 计算任务持续时长（保持原时长）
      const originalTask = draggedTask.value
      let duration = 60 // 默认1小时

      if (originalTask.startDate && originalTask.startDate.includes('T')) {
        const originalStart = originalTask.startDate.split('T')[1]?.slice(0, 5) || '00:00'
        const [h1, m1] = originalStart.split(':').map(Number)

        if (originalTask.dueDate && originalTask.dueDate.includes('T')) {
          const originalEnd = originalTask.dueDate.split('T')[1]?.slice(0, 5) || '00:00'
          const [h2, m2] = originalEnd.split(':').map(Number)
          duration = (h2 * 60 + m2) - (h1 * 60 + m1)
        }
      }

      // 计算新的结束时间
      const startMinutes = timeSlot.hour * 60 + timeSlot.minute
      const endMinutes = startMinutes + duration
      const endHour = Math.floor(endMinutes / 60)
      const endMinute = endMinutes % 60
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

      console.log('[拖拽] 预览时间:', { startTime, endTime, duration })
      dragPreviewTime.value = { startTime, endTime }
    }
  }
}

// 拖拽结束
function handleDragEnd() {
  isDragging.value = false
  draggedTask.value = null
  dragPreview.value = { x: 0, y: 0, visible: false }
  dropTarget.value = null
  dragPreviewTime.value = null
  emit('dragEnd')
}

// 开始调整大小
function handleResizeStart(task: GridTask, edge: 'top' | 'bottom', event: MouseEvent | TouchEvent) {
  event.preventDefault()
  justFinishedResize.value = false
  isResizing.value = true
  resizeEdge.value = edge
  resizingTask.value = task

  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  resizeStartY.value = clientY

  // 获取任务元素的位置信息
  const targetEl = (event.currentTarget as HTMLElement)?.parentElement
  if (targetEl) {
    resizeStartTop.value = targetEl.offsetTop
    resizeStartHeight.value = targetEl.offsetHeight
  }

  // 解析任务的开始和结束时间（转换为分钟数）
  if (task.startDate && task.startDate.includes('T')) {
    const startTime = task.startDate.split('T')[1]?.slice(0, 5) || '00:00'
    const [h, m] = startTime.split(':').map(Number)
    resizeStartTime.value = { minutes: h * 60 + m }
  }

  if (task.dueDate && task.dueDate.includes('T')) {
    const endTime = task.dueDate.split('T')[1]?.slice(0, 5) || '00:00'
    const [h, m] = endTime.split(':').map(Number)
    resizeEndTime.value = { minutes: h * 60 + m }
  }

  // 添加全局事件监听
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
  document.addEventListener('touchmove', handleResizeMove, { passive: false })
  document.addEventListener('touchend', handleResizeEnd)
}

// 调整大小中
function handleResizeMove(event: MouseEvent | TouchEvent) {
  if (!isResizing.value || !resizingTask.value) return

  event.preventDefault()

  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const deltaY = clientY - resizeStartY.value

  // 将像素变化转换为分钟数（支持5分钟粒度）
  const rowHeight = 36 // 每行高度（对应30分钟）
  const minutesPerRow = 30
  const resizeGranularity = 5 // 调整粒度：5分钟

  // 计算移动的分钟数，并以5分钟为单位舍入
  const deltaMinutes = Math.round((deltaY / rowHeight) * minutesPerRow / resizeGranularity) * resizeGranularity

  if (resizeEdge.value === 'top') {
    // 调整开始时间
    if (!resizeStartTime.value) return
    const newStartMinutes = resizeStartTime.value.minutes + deltaMinutes
    const newStartTime = formatMinutesToTime(newStartMinutes)

    // 确保开始时间早于结束时间（至少保留5分钟）
    if (resizeEndTime.value && newStartMinutes < resizeEndTime.value.minutes - resizeGranularity) {
      pendingNewStartTime.value = newStartTime
    }
  } else if (resizeEdge.value === 'bottom') {
    // 调整结束时间
    if (!resizeEndTime.value) return
    const newEndMinutes = resizeEndTime.value.minutes + deltaMinutes
    const newEndTime = formatMinutesToTime(newEndMinutes)

    // 确保结束时间晚于开始时间（至少保留5分钟）
    if (resizeStartTime.value && newEndMinutes > resizeStartTime.value.minutes + resizeGranularity) {
      pendingNewEndTime.value = newEndTime
    }
  }
}

// 结束调整大小
function handleResizeEnd() {
  if (resizingTask.value) {
    // 提交调整后的时间
    if (pendingNewStartTime.value || pendingNewEndTime.value) {
      // 记录正在更新的任务ID
      updatingTaskId.value = resizingTask.value.id
      emit('resizeTask', {
        task: resizingTask.value,
        newStartTime: pendingNewStartTime.value ?? undefined,
        newEndTime: pendingNewEndTime.value ?? undefined
      })
    }
  }

  // 清理调整状态
  isResizing.value = false
  resizingTask.value = null
  resizeEdge.value = null
  resizeStartTime.value = null
  resizeEndTime.value = null

  // 标记刚刚完成了调整，避免触发点击
  justFinishedResize.value = true
  setTimeout(() => {
    justFinishedResize.value = false
  }, 100)

  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
  document.removeEventListener('touchmove', handleResizeMove)
  document.removeEventListener('touchend', handleResizeEnd)
}

// 监听 weekColumns 变化，当任务数据更新后清空预览状态
watch(() => props.weekColumns, (newColumns, oldColumns) => {
  if (updatingTaskId.value && oldColumns) {
    // 检查任务数据是否已更新
    const taskUpdated = newColumns.some(col =>
      col.timedTasks.some(t => t.id === updatingTaskId.value)
    )

    if (taskUpdated) {
      // 数据已更新，延迟清空预览状态（确保新数据已渲染）
      setTimeout(() => {
        pendingNewStartTime.value = null
        pendingNewEndTime.value = null
        updatingTaskId.value = null
      }, 50)
    }
  }
}, { deep: true })

// 处理任务点击
function handleTaskClick(task: GridTask) {
  // 如果刚刚完成了调整操作，不触发点击
  if (justFinishedResize.value) {
    return
  }
  emit('clickTask', task)
}

// 将分钟数转换为 HH:mm 格式
function formatMinutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// 放置
function handleDrop(event: DragEvent, dateStr: string, timeSlot: TimeSlot) {
  event.preventDefault()
  console.log('[拖拽] handleDrop 被调用:', { dateStr, timeSlot })

  if (!(event.dataTransfer) || !draggedTask.value) {
    console.error('[拖拽] 缺少 dataTransfer 或 draggedTask')
    return
  }

  const taskId = event.dataTransfer.getData('text/plain')
  console.log('[拖拽] 拖拽数据:', { taskId, draggedTaskId: draggedTask.value.id })

  if (taskId !== draggedTask.value.id) {
    console.error('[拖拽] 任务ID不匹配')
    return
  }

  // 计算新的开始和结束时间
  const startTime = `${String(timeSlot.hour).padStart(2, '0')}:${String(timeSlot.minute).padStart(2, '0')}`
  console.log('[拖拽] 新的开始时间:', startTime)

  // 计算任务持续时长（保持原时长）
  const originalTask = draggedTask.value
  let duration = 60 // 默认1小时

  if (originalTask.startDate && originalTask.startDate.includes('T')) {
    const originalStart = originalTask.startDate.split('T')[1]?.slice(0, 5) || '00:00'
    const [h1, m1] = originalStart.split(':').map(Number)

    if (originalTask.dueDate && originalTask.dueDate.includes('T')) {
      const originalEnd = originalTask.dueDate.split('T')[1]?.slice(0, 5) || '00:00'
      const [h2, m2] = originalEnd.split(':').map(Number)
      duration = (h2 * 60 + m2) - (h1 * 60 + m1)
    }
  }

  console.log('[拖拽] 任务持续时间（分钟）:', duration)

  // 计算新的结束时间
  const startMinutes = timeSlot.hour * 60 + timeSlot.minute
  const endMinutes = startMinutes + duration
  const endHour = Math.floor(endMinutes / 60)
  const endMinute = endMinutes % 60
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

  console.log('[拖拽] 触发 dropTask 事件:', {
    taskId: originalTask.id,
    taskText: originalTask.text,
    newDateStr: dateStr,
    newStartTime: startTime,
    newEndTime: endTime
  })

  // 触发放置事件
  emit('dropTask', {
    task: originalTask,
    newDateStr: dateStr,
    newStartTime: startTime,
    newEndTime: endTime
  })

  handleDragEnd()
}

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

// 时间字符串转换为分钟数
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// 分钟数转换为行索引
function minutesToRow(minutes: number): number {
  const startMinutes = props.timeStart * 60
  return Math.floor((minutes - startMinutes) / props.slotDuration)
}

// 分钟数转换为像素位置（支持5分钟粒度）
function minutesToPixels(minutes: number): number {
  const startMinutes = props.timeStart * 60
  const minutesPerRow = 30 // 网格每行30分钟
  const relativeMinutes = minutes - startMinutes
  return (relativeMinutes / minutesPerRow) * rowHeight
}

// 获取任务样式
function getTaskStyle(task: GridTask): {
  top: string
  height: string
  backgroundColor: string
  left?: string
  width?: string
} {
  // 使用分钟数计算精确位置（1分钟粒度）
  const startMinutes = task.startMinutes ?? task.startRow * props.slotDuration + props.timeStart * 60
  const endMinutes = task.endMinutes ?? ((task.startRow + task.rowSpan) * props.slotDuration + props.timeStart * 60)

  let top = minutesToPixels(startMinutes)
  let height = Math.max(rowHeight - 2, minutesToPixels(endMinutes) - minutesToPixels(startMinutes) - 2)

  // 如果是正在调整的任务或正在更新数据的任务，使用临时时间计算位置和高度
  const isAdjusting = (resizingTask.value && resizingTask.value.id === task.id) ||
                      (updatingTaskId.value && updatingTaskId.value === task.id && (pendingNewStartTime.value || pendingNewEndTime.value))

  if (isAdjusting) {
    // 计算调整后的开始时间
    let newStartMinutes: number | null = null
    let newEndMinutes: number | null = null

    if (resizeStartTime.value && pendingNewStartTime.value) {
      newStartMinutes = timeToMinutes(pendingNewStartTime.value)
    } else if (resizeStartTime.value) {
      newStartMinutes = resizeStartTime.value.minutes
    }

    if (resizeEndTime.value && pendingNewEndTime.value) {
      newEndMinutes = timeToMinutes(pendingNewEndTime.value)
    } else if (resizeEndTime.value) {
      newEndMinutes = resizeEndTime.value.minutes
    }

    // 使用像素计算支持5分钟粒度
    if (newStartMinutes !== null) {
      top = minutesToPixels(newStartMinutes)
    }

    if (newStartMinutes !== null && newEndMinutes !== null) {
      const startPixels = minutesToPixels(newStartMinutes)
      const endPixels = minutesToPixels(newEndMinutes)
      height = Math.max(rowHeight - 2, endPixels - startPixels - 2)
    }
  }

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

  return style
}

// 格式化任务时间
function formatTaskTime(task: GridTask): string {
  // 如果是正在拖拽的任务，显示预览时间
  if (isDragging.value && draggedTask.value?.id === task.id && dragPreviewTime.value) {
    return `${dragPreviewTime.value.startTime} - ${dragPreviewTime.value.endTime}`
  }

  // 如果是正在调整的任务或正在更新数据的任务，显示临时时间
  const isAdjusting = (resizingTask.value && resizingTask.value.id === task.id) ||
                      (updatingTaskId.value && updatingTaskId.value === task.id)

  if (isAdjusting) {
    const startTime = pendingNewStartTime.value ||
      (task.startDate?.split('T')[1]?.slice(0, 5) || '')
    const endTime = pendingNewEndTime.value ||
      (task.dueDate?.split('T')[1]?.slice(0, 5) || '')

    if (startTime && endTime) {
      return `${startTime} - ${endTime}`
    }
    return startTime
  }

  // 正常显示任务时间
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
  nextTick(() => {
    syncColumnWidths()
    syncHeaderHeight()
  })
}, { deep: true })

// 调试：监控时间槽变化
watch(() => props.timeSlots, (newSlots) => {
  console.log('[周视图] 时间槽数据更新:', {
    总数: newSlots.length,
    前5个: newSlots.slice(0, 5).map(s => ({ label: s.label, hour: s.hour, minute: s.minute, value: s.value })),
    后5个: newSlots.slice(-5).map(s => ({ label: s.label, hour: s.hour, minute: s.minute, value: s.value }))
  })
}, { immediate: true })

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

/* 拖拽时禁用任务层事件接收，让事件传递到时间单元格 */
.tasks-layer.is-dragging {
  pointer-events: none;
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
  overflow: visible; /* 允许手柄超出边界 */
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

.grid-task.dragging {
  opacity: 0.01; /* 几乎透明但不为0，保持拖拽功能 */
  pointer-events: none; /* 不接收任何事件 */
}

.grid-task:active {
  cursor: grabbing;
}

.time-cell.drag-over {
  background-color: rgba(0, 122, 255, 0.15) !important;
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

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 1;
  touch-action: none;
}

.resize-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 2px;
}

.resize-handle-top {
  top: 0;
}

.resize-handle-bottom {
  bottom: 0;
}

.resize-handle-top::after {
  top: 2px;
}

.resize-handle-bottom::after {
  bottom: 2px;
}

.grid-task:hover .resize-handle {
  opacity: 1;
}

.resize-handle.active {
  opacity: 1;
}

.resize-handle.active::after {
  background: rgba(255, 255, 255, 0.7);
}

.grid-task.resizing {
  cursor: ns-resize;
  user-select: none;
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
