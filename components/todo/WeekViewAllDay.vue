<template>
  <div class="all-day-section">
    <!-- 左侧标签 -->
    <div class="all-day-label">全天</div>

    <!-- 全天任务网格容器 -->
    <div ref="allDayGridRef" class="all-day-grid-container">
      <!-- 全天任务网格 -->
      <div ref="allDayGridInnerRef" class="all-day-grid">
        <div
          v-for="(column, index) in weekDays"
          :key="column.dateStr"
          :ref="el => setColumnRef(el, index)"
          class="all-day-column"
          :class="{ 'is-today': column.isToday }"
        >
          <div
            v-for="task in column.allDayTasks"
            :key="task.id"
            class="all-day-task"
            :class="{ completed: task.completed, dragging: isDragging && draggedTask?.id === task.id }"
            :style="{ backgroundColor: task.color }"
            draggable="true"
            @click="$emit('clickTask', task)"
            @dragstart="(e) => handleDragStart(task, e)"
            @dragend="handleDragEnd"
          >
            <button
              class="task-checkbox"
              @click.stop="$emit('toggleTask', task.id)"
            >
              <Icon
                :name="task.completed ? SOLAR_ICONS.status.success : SOLAR_ICONS.status.pending"
                :size="14"
              />
            </button>
            <span class="task-text">{{ task.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { DayColumn, GridTask } from '~/composables/useTodoWeekView'

interface Props {
  weekDays: DayColumn[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleTask: [id: string]
  clickTask: [task: GridTask]
  dragStart: [task: GridTask, event: DragEvent]
  dragEnd: []
}>()

// 引用
const allDayGridRef = ref<HTMLElement>()
const allDayGridInnerRef = ref<HTMLElement>()
const columnRefs: (HTMLElement | null)[] = []

// 拖拽相关状态
const isDragging = ref(false)
const draggedTask = ref<GridTask | null>(null)

// 开始拖拽
function handleDragStart(task: GridTask, event: DragEvent) {
  if (!(event.dataTransfer)) return
  isDragging.value = true
  draggedTask.value = task

  // 设置拖拽数据
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)
  event.dataTransfer.setData('task-type', 'all-day')

  // 触发事件
  emit('dragStart', task, event)
}

// 拖拽结束
function handleDragEnd() {
  isDragging.value = false
  draggedTask.value = null
  emit('dragEnd')
}

function setColumnRef(el: any, index: number) {
  if (el) {
    columnRefs[index] = el as HTMLElement
  }
}

// 从 WeekViewGrid 接收列宽并同步
const columnWidths = ref<number[]>([])

// 监听来自 WeekViewGrid 的列宽更新事件
onMounted(() => {
  // 监听自定义事件来接收列宽
  window.addEventListener('todo-week-column-widths', handleColumnWidthsUpdate as EventListener)
  window.addEventListener('todo-week-sync-columns', syncWidthsFromGrid as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('todo-week-column-widths', handleColumnWidthsUpdate as EventListener)
  window.removeEventListener('todo-week-sync-columns', syncWidthsFromGrid as EventListener)
})

function handleColumnWidthsUpdate(e: Event) {
  const customEvent = e as CustomEvent<number[]>
  if (customEvent.detail && Array.isArray(customEvent.detail)) {
    columnWidths.value = customEvent.detail
    applyColumnWidths()
  }
}

function syncWidthsFromGrid() {
  // 从 WeekViewGrid 读取列宽
  const gridColumns = document.querySelectorAll('.week-grid-container .day-column-bg')
  if (gridColumns.length > 0 && columnRefs.length === gridColumns.length) {
    gridColumns.forEach((col, index) => {
      if (columnRefs[index]) {
        columnRefs[index]!.style.width = col.offsetWidth + 'px'
      }
    })
  }
}

function applyColumnWidths() {
  columnWidths.value.forEach((width, index) => {
    if (columnRefs[index]) {
      columnRefs[index]!.style.width = width + 'px'
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  syncWidthsFromGrid
})
</script>

<style scoped>
.all-day-section {
  display: flex;
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  min-height: 40px;
  overflow: hidden;
}

.all-day-label {
  width: 50px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  text-transform: uppercase;
  border-right: 1px solid rgba(60, 60, 67, 0.08);
  background: rgba(255, 255, 255, 0.2);
}

.all-day-grid-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.all-day-grid {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.all-day-grid::-webkit-scrollbar {
  display: none;
}

.all-day-column {
  flex-shrink: 0;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid rgba(60, 60, 67, 0.06);
  box-sizing: border-box;
}

.all-day-column:last-child {
  border-right: none;
}

.all-day-column.is-today {
  background: rgba(0, 122, 255, 0.03);
}

.all-day-task {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
}

.all-day-task:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.all-day-task.completed {
  opacity: 0.6;
}

.all-day-task.completed .task-text {
  text-decoration: line-through;
}

.all-day-task.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.all-day-task:active {
  cursor: grabbing;
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
}

.task-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .all-day-label {
    color: rgba(255, 255, 255, 0.5);
    border-right-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.08);
  }

  .all-day-column {
    border-right-color: rgba(255, 255, 255, 0.06);
  }

  .all-day-column.is-today {
    background: rgba(0, 122, 255, 0.05);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .all-day-column {
    min-width: 100px;
  }
}
</style>
