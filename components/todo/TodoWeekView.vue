<template>
  <div class="todo-week-view">
    <!-- 周视图头部 -->
    <WeekViewHeader
      :week-start="config.weekStart"
      :time-start="config.timeStart"
      :time-end="config.timeEnd"
      :color-mode="config.colorMode"
      @prev-week="prevWeek"
      @next-week="nextWeek"
      @go-today="goToToday"
      @open-settings="showSettings = true"
    />

    <!-- 周视图主体 -->
    <div class="week-body">
      <!-- 全天任务区域 -->
      <WeekViewAllDay
        :week-days="weekColumns"
        :loading="loading"
        @toggle-task="handleToggleTask"
        @click-task="handleClickTask"
        @drag-start="handleAllDayDragStart"
        @drag-end="handleDragEnd"
      />

      <!-- 时间网格 -->
      <WeekViewGrid
        :time-slots="timeSlots"
        :week-columns="weekColumns"
        :loading="loading"
        :time-start="config.timeStart"
        :slot-duration="config.slotDuration"
        @toggle-task="handleToggleTask"
        @click-task="handleClickTask"
        @click-cell="handleClickCell"
        @drop-task="handleDropTask"
        @resize-task="handleResizeTask"
      />
    </div>

    <!-- 设置对话框 -->
    <WeekViewSettings
      v-model:visible="showSettings"
      :time-start="config.timeStart"
      :time-end="config.timeEnd"
      :color-mode="config.colorMode"
      @update-time-range="handleUpdateTimeRange"
      @update-color-mode="handleUpdateColorMode"
    />

    <!-- 任务编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showEditDialog"
      :todo="editingTask"
      :initial-data="initialTaskData"
      :is-creating="isCreating"
      :available-parent-todos="availableParentTodos"
      @save="handleSaveTask"
      @create="handleCreateTask"
      @delete="handleDeleteTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import { getDB } from '~/services/db'
import { useTodoWeekView, type TodoColorMode } from '~/composables/useTodoWeekView'
import type { GridTask } from '~/composables/useTodoWeekView'
import type { TodoItem } from '~/types/todo'
import WeekViewHeader from './WeekViewHeader.vue'
import WeekViewAllDay from './WeekViewAllDay.vue'
import WeekViewGrid from './WeekViewGrid.vue'
import WeekViewSettings from './WeekViewSettings.vue'
import TodoEditDialog from './TodoEditDialog.vue'

interface Props {
  weekStart?: Date
  timeStart?: number
  timeEnd?: number
  colorMode?: TodoColorMode
}

const props = withDefaults(defineProps<Props>(), {
  timeStart: 8,
  timeEnd: 23,
  colorMode: 'priority'
})

const emit = defineEmits<{
  (e: 'update:weekStart', value: Date): void
}>()

const showSettings = ref(false)

// 可用父任务列表（从当前加载的任务中获取）
const availableParentTodos = computed(() => {
  const allTasks: GridTask[] = []
  // 从 weekColumns 中收集所有任务
  for (const col of weekColumns.value) {
    allTasks.push(...col.allDayTasks, ...col.timedTasks)
  }
  // 基础列表：排除已完成的任务
  const baseList = allTasks
    .filter(t => !t.completed && !t.statusIsCompleted)
    .map(t => ({
      id: t.id,
      text: t.text,
      parentId: t.parentId,
      completed: t.completed
    }))

  // 如果正在编辑任务，确保其父任务在列表中（即使已完成）
  if (editingTask.value?.parentId) {
    const parentId = editingTask.value.parentId
    if (!baseList.some(t => t.id === parentId)) {
      const parentTask = allTasks.find(t => t.id === parentId)
      if (parentTask) {
        baseList.push({
          id: parentTask.id,
          text: parentTask.text,
          parentId: parentTask.parentId,
          completed: parentTask.completed
        })
      }
    }
  }

  return baseList
})
const showEditDialog = ref(false)
const editingTask = ref<TodoItem | null>(null)
const isCreating = ref(false)
const initialTaskData = ref<Partial<TodoItem> | null>(null)

// 使用 composable
const {
  loading,
  config,
  timeSlots,
  weekDays,
  weekColumns,
  loadWeekTasks,
  subscribeChanges,
  unsubscribeChanges,
  prevWeek,
  nextWeek,
  goToToday,
  setWeekStart,
  updateTimeRange,
  updateColorMode
} = useTodoWeekView({
  timeStart: props.timeStart,
  timeEnd: props.timeEnd,
  colorMode: props.colorMode
})

// 监听 props 变化更新配置
watch(() => props.weekStart, (newVal) => {
  if (newVal) {
    setWeekStart(newVal)
  }
}, { immediate: true })

// 监听配置变化通知父组件
watch(() => config.weekStart, (newVal) => {
  emit('update:weekStart', new Date(newVal))
})

// 初始化
onMounted(() => {
  loadWeekTasks()
  subscribeChanges()
})

onUnmounted(() => {
  unsubscribeChanges()
})

// 事件处理
async function handleToggleTask(taskId: string) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: any[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === taskId)
        if (index !== -1) {
          data.todos[index].completed = !data.todos[index].completed
          await doc.patch({ data: { todos: data.todos } })
          await loadWeekTasks()
          break
        }
      }
    }
  } catch (err) {
    console.error('切换任务状态失败:', err)
  }
}

function handleClickTask(task: GridTask) {
  // 打开编辑对话框
  isCreating.value = false
  initialTaskData.value = null
  editingTask.value = task
  showEditDialog.value = true
}

function handleUpdateTimeRange(start: number, end: number) {
  updateTimeRange(start, end)
}

// 全天任务开始拖拽
const draggingAllDayTask = ref<GridTask | null>(null)

function handleAllDayDragStart(task: GridTask, event: DragEvent) {
  draggingAllDayTask.value = task
}

function handleDragEnd() {
  draggingAllDayTask.value = null
}

function handleUpdateColorMode(mode: TodoColorMode) {
  updateColorMode(mode)
}

// 保存任务
async function handleSaveTask(todo: TodoItem) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === todo.id)
        if (index !== -1) {
          data.todos[index] = todo
          await doc.patch({ data: { todos: data.todos } })
          await loadWeekTasks()
          break
        }
      }
    }
  } catch (err) {
    console.error('保存任务失败:', err)
  }
}

// 点击时间单元格创建任务
function handleClickCell(data: { dateStr: string; timeSlot: { hour: number; minute: number; label: string } }) {
  isCreating.value = true
  editingTask.value = null

  // 格式化开始时间字符串
  const startTime = `${String(data.timeSlot.hour).padStart(2, '0')}:${String(data.timeSlot.minute).padStart(2, '0')}`

  // 计算结束时间（使用配置的 slotDuration）
  const slotDuration = config.slotDuration || 30
  const totalMinutes = data.timeSlot.hour * 60 + data.timeSlot.minute + slotDuration
  const endHour = Math.floor(totalMinutes / 60)
  const endMinute = totalMinutes % 60
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

  // 将时间合并到日期中，格式为 YYYY-MM-DDTHH:mm
  initialTaskData.value = {
    startDate: `${data.dateStr}T${startTime}`,
    dueDate: `${data.dateStr}T${endTime}`
  }
  showEditDialog.value = true
}

// 创建新任务
async function handleCreateTask(todo: TodoItem) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    if (moduleDataList.length === 0) {
      // 如果没有模块数据，需要创建一个
      const { generateId, now } = await import('~/services/db')
      const workspaceId = localStorage.getItem('lifeos:active-workspace-id')
      await db.module_data.insert({
        id: generateId(),
        moduleId: 'todo',
        noteId: workspaceId || 'default',
        data: { todos: [todo] },
        createdAt: now(),
        updatedAt: now()
      })
    } else {
      // 使用第一个模块数据
      const doc = moduleDataList[0]
      const data = doc.get('data') as { todos: TodoItem[] } || { todos: [] }
      data.todos.push(todo)
      await doc.patch({ data: { todos: data.todos } })
    }

    await loadWeekTasks()
  } catch (err) {
    console.error('创建任务失败:', err)
  }
}

// 拖拽任务到新位置
async function handleDropTask(data: {
  task: GridTask
  newDateStr: string
  newStartTime: string
  newEndTime: string
}) {
  console.log('[周视图] handleDropTask 接收数据:', {
    taskId: data.task.id,
    taskText: data.task.text,
    newDateStr: data.newDateStr,
    newStartTime: data.newStartTime,
    newEndTime: data.newEndTime,
    oldStartDate: data.task.startDate,
    oldDueDate: data.task.dueDate
  })

  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    console.log('[周视图] 找到模块数据数量:', moduleDataList.length)

    let taskFound = false
    for (const doc of moduleDataList) {
      const todos = doc.get('data') as { todos: TodoItem[] } | undefined
      if (todos?.todos) {
        const index = todos.todos.findIndex(t => t.id === data.task.id)
        console.log('[周视图] 查找任务:', { taskId: data.task.id, found: index !== -1, index })
        if (index !== -1) {
          taskFound = true
          // 更新任务的日期和时间
          const newStartDate = `${data.newDateStr}T${data.newStartTime}`
          const newDueDate = `${data.newDateStr}T${data.newEndTime}`

          console.log('[周视图] 更新任务时间:', {
            oldStart: todos.todos[index].startDate,
            oldEnd: todos.todos[index].dueDate,
            newStart: newStartDate,
            newEnd: newDueDate
          })

          todos.todos[index].startDate = newStartDate
          todos.todos[index].dueDate = newDueDate
          await doc.patch({ data: { todos: todos.todos } })
          console.log('[周视图] 数据已保存到数据库')
          await loadWeekTasks()
          console.log('[周视图] 已重新加载任务')
          break
        }
      }
    }

    if (!taskFound) {
      console.error('[周视图] 未找到要更新的任务:', data.task.id)
    }
  } catch (err) {
    console.error('[周视图] 拖拽任务失败:', err)
  }
}

// 调整任务时间（开始/结束）
async function handleResizeTask(data: {
  task: GridTask
  newStartTime?: string
  newEndTime?: string
}) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const todos = doc.get('data') as { todos: TodoItem[] } | undefined
      if (todos?.todos) {
        const index = todos.todos.findIndex(t => t.id === data.task.id)
        if (index !== -1) {
          const originalTask = todos.todos[index]

          // 获取原任务的日期部分
          const originalDatePart = originalTask.startDate?.split('T')[0] || ''

          // 更新开始时间
          if (data.newStartTime !== undefined && originalDatePart) {
            todos.todos[index].startDate = `${originalDatePart}T${data.newStartTime}`
          }

          // 更新结束时间
          if (data.newEndTime !== undefined && originalTask.dueDate) {
            const dueDatePart = originalTask.dueDate.split('T')[0] || originalDatePart
            todos.todos[index].dueDate = `${dueDatePart}T${data.newEndTime}`
          }

          await doc.patch({ data: { todos: todos.todos } })
          await loadWeekTasks()
          break
        }
      }
    }
  } catch (err) {
    console.error('调整任务时间失败:', err)
  }
}

// 删除任务
async function handleDeleteTask(todo: TodoItem) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === todo.id)
        if (index !== -1) {
          data.todos.splice(index, 1)
          await doc.patch({ data: { todos: data.todos } })
          await loadWeekTasks()
          break
        }
      }
    }
  } catch (err) {
    console.error('删除任务失败:', err)
  }
}
</script>

<style scoped>
.todo-week-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(var(--liquid-blur, 20px));
  border-radius: var(--liquid-radius, 20px);
}

.week-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .todo-week-view {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.05));
  }
}
</style>
