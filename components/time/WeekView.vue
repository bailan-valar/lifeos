<template>
  <div class="week-view">
    <!-- 星期头部 -->
    <div class="week-header">
      <div class="week-info">
        <h3 class="week-title">{{ weekTitle }}</h3>
        <span class="week-range">{{ weekRange }}</span>
      </div>
      <div class="week-actions">
        <button class="action-btn" @click="goToToday" v-if="!isCurrentWeek">
          <Icon name="solar:calendar-mark-linear" size="16" />
          今天
        </button>
      </div>
    </div>

    <!-- 周日历网格 -->
    <div class="week-grid">
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        class="day-column"
        :class="{
          'is-today': day.isToday,
          'is-other-month': day.isOtherMonth
        }"
        @click="selectDay(day.date)"
      >
        <!-- 日期头部 -->
        <div class="day-header">
          <div class="day-name">{{ day.dayName }}</div>
          <div class="day-number" :class="{ 'today-badge': day.isToday }">
            {{ day.dayNumber }}
          </div>
        </div>

        <!-- 当天任务列表 -->
        <div class="day-tasks">
          <div
            v-for="task in getDayTasks(day.dateStr)"
            :key="task.id"
            class="task-item"
            :class="{
              'completed': task.completed,
              'high-priority': task.priority === 'high',
              'has-type': task.typeId
            }"
            :style="{ borderLeftColor: task.typeColor }"
            @click.stop="openTask(task)"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragover.prevent
            @drop="onDrop($event, day.dateStr)"
          >
            <div class="task-checkbox" @click.stop="toggleTask(task)">
              <Icon
                :name="task.completed ? 'solar:check-circle-bold' : 'solar:round-linear'"
                :size="18"
                :class="{ checked: task.completed }"
              />
            </div>
            <div class="task-content">
              <div class="task-text">{{ task.text }}</div>
              <div class="task-meta" v-if="task.noteTitle || task.typeName">
                <span v-if="task.typeName" class="task-type" :style="{ color: task.typeColor }">
                  <Icon :name="task.typeIcon" size="12" />
                  {{ task.typeName }}
                </span>
                <span v-if="task.noteTitle" class="task-note">{{ task.noteTitle }}</span>
              </div>
            </div>
            <div class="task-actions">
              <button class="task-action-btn" @click.stop="editTask(task)">
                <Icon name="solar:pen-2-linear" size="14" />
              </button>
            </div>
          </div>

          <!-- 添加任务按钮 -->
          <button
            class="add-task-btn"
            @click.stop="addTask(day.dateStr)"
            v-if="day.isToday || dayTasks[day.dateStr]?.length > 0"
          >
            <Icon name="solar:add-circle-linear" size="16" />
            <span>添加任务</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 悬浮添加按钮 -->
    <button class="fab-add" @click="addTask(todayStr)">
      <Icon name="solar:add-circle-linear" size="24" />
    </button>

    <!-- 任务编辑对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showTaskDialog" class="modal-overlay" @click="closeTaskDialog">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ editingTask ? '编辑任务' : '新建任务' }}</h3>
              <button class="close-btn" @click="closeTaskDialog">
                <Icon name="solar:close-circle-linear" size="20" />
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <input
                  v-model="taskForm.text"
                  class="task-input"
                  placeholder="任务内容..."
                  @keyup.enter="saveTask"
                  ref="taskInput"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>日期</label>
                  <input
                    v-model="taskForm.date"
                    type="date"
                    class="date-input"
                  />
                </div>

                <div class="form-group" v-if="todoTypes.length > 0">
                  <label>类型</label>
                  <select v-model="taskForm.typeId" class="type-select">
                    <option value="">无类型</option>
                    <option v-for="type in todoTypes" :key="type.id" :value="type.id">
                      {{ type.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>优先级</label>
                <div class="priority-options">
                  <button
                    v-for="priority in ['none', 'low', 'medium', 'high']"
                    :key="priority"
                    class="priority-btn"
                    :class="{ active: taskForm.priority === priority }"
                    @click="taskForm.priority = priority"
                  >
                    {{ priorityLabels[priority] }}
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="closeTaskDialog">取消</button>
              <button class="btn-primary" @click="saveTask">
                {{ editingTask ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  dueDate?: string
  typeId?: string
  priority?: 'none' | 'low' | 'medium' | 'high'
  parentId?: string
  noteId?: string
  noteTitle?: string
}

interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
}

interface TaskWithType extends TodoItem {
  typeName?: string
  typeIcon?: string
  typeColor?: string
}

const props = defineProps<{
  weekStart: Date
}>()

const emit = defineEmits<{
  'select-date': [date: Date]
}>()

const dayTasks = ref<Record<string, TaskWithType[]>>({})
const todoTypes = ref<TodoType[]>([])
const showTaskDialog = ref(false)
const editingTask = ref<TaskWithType | null>(null)
const taskInput = ref<HTMLInputElement | null>(null)

const taskForm = reactive({
  text: '',
  date: '',
  typeId: '',
  priority: 'none' as 'none' | 'low' | 'medium' | 'high'
})

const priorityLabels = {
  none: '无',
  low: '低',
  medium: '中',
  high: '高'
}

// 计算属性
const todayStr = computed(() => {
  return new Date().toISOString().slice(0, 10)
})

const weekDays = computed(() => {
  const days = []
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  for (let i = 0; i < 7; i++) {
    const date = new Date(props.weekStart)
    date.setDate(date.getDate() + i)

    const dateStr = date.toISOString().slice(0, 10)
    const isToday = dateStr === todayStr.value

    days.push({
      date: new Date(date),
      dateStr,
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      isToday,
      isOtherMonth: false
    })
  }

  return days
})

const weekTitle = computed(() => {
  const start = new Date(props.weekStart)
  const end = new Date(props.weekStart)
  end.setDate(end.getDate() + 6)

  if (start.getMonth() === end.getMonth()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月`
  } else {
    return `${start.getMonth() + 1}月-${end.getMonth() + 1}月`
  }
})

const weekRange = computed(() => {
  const start = new Date(props.weekStart)
  const end = new Date(props.weekStart)
  end.setDate(end.getDate() + 6)

  const formatDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
  return `${formatDate(start)} - ${formatDate(end)}`
})

const isCurrentWeek = computed(() => {
  const today = new Date()
  const weekEnd = new Date(props.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return today >= props.weekStart && today <= weekEnd
})

// 方法
function getDayTasks(dateStr: string): TaskWithType[] {
  return dayTasks.value[dateStr] || []
}

function selectDay(date: Date) {
  emit('select-date', date)
}

function goToToday() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - diff)
  weekStart.setHours(0, 0, 0, 0)

  emit('select-date', weekStart)
}

async function toggleTask(task: TaskWithType) {
  try {
    const db = await getDB()

    // 找到包含这个任务的笔记模块数据
    const moduleDataList = await db.module_data.find({
      selector: {
        moduleId: 'todo'
      }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data.todos) {
        const todoIndex = data.todos.findIndex(t => t.id === task.id)
        if (todoIndex !== -1) {
          data.todos[todoIndex].completed = !task.completed
          await doc.patch({ data: { todos: data.todos } })

          // 更新本地状态
          task.completed = !task.completed
          break
        }
      }
    }
  } catch (error) {
    console.error('切换任务状态失败:', error)
  }
}

function openTask(task: TaskWithType) {
  // 可以在这里打开任务详情或跳转到对应笔记
  if (task.noteId) {
    navigateTo(`/notes?note=${task.noteId}`)
  }
}

function editTask(task: TaskWithType) {
  editingTask.value = task
  taskForm.text = task.text
  taskForm.date = task.dueDate || todayStr.value
  taskForm.typeId = task.typeId || ''
  taskForm.priority = task.priority || 'none'
  showTaskDialog.value = true

  nextTick(() => {
    taskInput.value?.focus()
  })
}

function addTask(dateStr?: string) {
  editingTask.value = null
  taskForm.text = ''
  taskForm.date = dateStr || todayStr.value
  taskForm.typeId = ''
  taskForm.priority = 'none'
  showTaskDialog.value = true

  nextTick(() => {
    taskInput.value?.focus()
  })
}

async function saveTask() {
  if (!taskForm.text.trim()) {
    return
  }

  try {
    const db = await getDB()

    if (editingTask.value) {
      // 更新现有任务
      const moduleDataList = await db.module_data.find({
        selector: {
          moduleId: 'todo'
        }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const todoIndex = data.todos.findIndex(t => t.id === editingTask.value!.id)
          if (todoIndex !== -1) {
            data.todos[todoIndex] = {
              ...data.todos[todoIndex],
              text: taskForm.text.trim(),
              dueDate: taskForm.date,
              typeId: taskForm.typeId || undefined,
              priority: taskForm.priority
            }
            await doc.patch({ data: { todos: data.todos } })
            break
          }
        }
      }
    } else {
      // 创建新任务 - 创建到默认笔记或创建新笔记
      const notes = await db.notes.find().exec()
      let targetNote = notes[0]

      if (!targetNote) {
        // 创建一个新笔记来存储任务
        const noteId = generateId()
        await db.notes.insert({
          id: noteId,
          title: '待办任务',
          content: '',
          createdAt: now(),
          updatedAt: now()
        })
        targetNote = await db.notes.findOne(noteId).exec()
      }

      if (targetNote) {
        const moduleData = await db.module_data.findOne({
          selector: {
            noteId: targetNote.get('id'),
            moduleId: 'todo'
          }
        }).exec()

        const newTodo: TodoItem = {
          id: generateId(),
          text: taskForm.text.trim(),
          completed: false,
          createdAt: now(),
          dueDate: taskForm.date,
          typeId: taskForm.typeId || undefined,
          priority: taskForm.priority,
          noteId: targetNote.get('id'),
          noteTitle: targetNote.get('title')
        }

        if (moduleData) {
          const data = moduleData.get('data') as { todos: TodoItem[] }
          data.todos.push(newTodo)
          await moduleData.patch({ data: { todos: data.todos } })
        } else {
          await db.module_data.insert({
            id: generateId(),
            noteId: targetNote.get('id'),
            moduleId: 'todo',
            data: { todos: [newTodo] },
            createdAt: now(),
            updatedAt: now()
          })
        }
      }
    }

    await loadWeekTasks()
    closeTaskDialog()
  } catch (error) {
    console.error('保存任务失败:', error)
  }
}

function closeTaskDialog() {
  showTaskDialog.value = false
  editingTask.value = null
  taskForm.text = ''
  taskForm.date = todayStr.value
  taskForm.typeId = ''
  taskForm.priority = 'none'
}

// 拖拽相关
let draggedTask: TaskWithType | null = null

function onDragStart(event: DragEvent, task: TaskWithType) {
  draggedTask = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDrop(event: DragEvent, targetDate: string) {
  event.preventDefault()
  if (!draggedTask) return

  // 更新任务日期
  draggedTask.dueDate = targetDate

  // 这里需要实际更新数据库
  updateTaskDate(draggedTask, targetDate)

  draggedTask = null
}

async function updateTaskDate(task: TaskWithType, newDate: string) {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: {
        moduleId: 'todo'
      }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data.todos) {
        const todoIndex = data.todos.findIndex(t => t.id === task.id)
        if (todoIndex !== -1) {
          data.todos[todoIndex].dueDate = newDate
          await doc.patch({ data: { todos: data.todos } })

          // 重新加载任务
          await loadWeekTasks()
          break
        }
      }
    }
  } catch (error) {
    console.error('更新任务日期失败:', error)
  }
}

// 加载数据
async function loadWeekTasks() {
  try {
    const db = await getDB()

    // 加载待办类型
    const typeDocs = await db.todo_types.find().exec()
    todoTypes.value = typeDocs.map(doc => doc.toJSON()) as TodoType[]

    // 计算本周日期范围
    const startDate = new Date(props.weekStart)
    const endDate = new Date(props.weekStart)
    endDate.setDate(endDate.getDate() + 7) // 扩展一天确保包含所有时区的任务

    const startIso = startDate.toISOString().slice(0, 10)
    const endIso = endDate.toISOString().slice(0, 10)

    // 加载所有待办任务
    const moduleDataList = await db.module_data.find({
      selector: {
        moduleId: 'todo'
      }
    }).exec()

    const tasksByDate: Record<string, TaskWithType[]> = {}

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data.todos) {
        for (const todo of data.todos) {
          // 只处理有截止日期的任务
          const taskDate = todo.dueDate || todo.createdAt.slice(0, 10)

          // 检查是否在本周内
          if (taskDate >= startIso && taskDate < endIso) {
            if (!tasksByDate[taskDate]) {
              tasksByDate[taskDate] = []
            }

            let taskWithType: TaskWithType = { ...todo }

            // 添加类型信息
            if (todo.typeId) {
              const type = todoTypes.value.find(t => t.id === todo.typeId)
              if (type) {
                taskWithType.typeName = type.name
                taskWithType.typeIcon = type.icon
                taskWithType.typeColor = type.color
              }
            }

            // 添加笔记标题
            if (todo.noteId) {
              const note = await db.notes.findOne(todo.noteId).exec()
              if (note) {
                taskWithType.noteTitle = note.get('title')
              }
            }

            tasksByDate[taskDate].push(taskWithType)
          }
        }
      }
    }

    // 排序任务
    for (const date in tasksByDate) {
      tasksByDate[date].sort((a, b) => {
        // 先按完成状态排序
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1
        }
        // 再按优先级排序
        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 }
        const priorityA = priorityOrder[a.priority || 'none']
        const priorityB = priorityOrder[b.priority || 'none']
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        // 最后按创建时间排序
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    }

    dayTasks.value = tasksByDate
  } catch (error) {
    console.error('加载周任务失败:', error)
  }
}

onMounted(async () => {
  await loadWeekTasks()
})

watch(() => props.weekStart, async () => {
  await loadWeekTasks()
})
</script>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
}

.week-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.week-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.week-range {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
}

.week-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.week-grid {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 8px;
  padding: 16px;
}

.day-column {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.08);
  overflow: hidden;
  transition: all 0.2s;
}

.day-column:hover {
  background: rgba(255, 255, 255, 0.8);
}

.day-column.is-today {
  background: rgba(0, 122, 255, 0.03);
  border-color: rgba(0, 122, 255, 0.2);
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.06);
  background: rgba(255, 255, 255, 0.3);
}

.day-name {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
  font-weight: 500;
}

.day-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  background: rgba(60, 60, 67, 0.05);
}

.day-number.today-badge {
  background: rgb(0, 122, 255);
  color: white;
}

.day-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  border: 0.5px solid rgba(60, 60, 67, 0.08);
  border-left: 3px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-text {
  text-decoration: line-through;
  color: rgba(60, 60, 67, 0.4);
}

.task-item.high-priority {
  border-left-color: #ef4444;
}

.task-item.has-type {
  border-left-color: #3b82f6;
}

.task-checkbox {
  flex-shrink: 0;
  padding: 2px;
  color: rgba(60, 60, 67, 0.3);
  cursor: pointer;
  transition: color 0.2s;
}

.task-checkbox:hover {
  color: rgba(0, 122, 255, 0.5);
}

.task-checkbox .checked {
  color: rgb(52, 199, 89);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.4;
  word-break: break-word;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.task-type {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.08);
  font-weight: 500;
}

.task-note {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(60, 60, 67, 0.06);
}

.task-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-item:hover .task-actions {
  opacity: 1;
}

.task-action-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-action-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.add-task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed rgba(60, 60, 67, 0.2);
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-task-btn:hover {
  border-color: rgba(0, 122, 255, 0.4);
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
}

.fab-add {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 100;
}

.fab-add:hover {
  background: rgb(0, 110, 250);
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.5);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.task-input {
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.task-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.date-input, .type-select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.priority-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.priority-btn {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.priority-btn:hover {
  background: #f9fafb;
}

.priority-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s, opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .week-grid {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .day-column {
    flex: 0 0 auto;
  }

  .fab-add {
    right: 16px;
    bottom: 16px;
    width: 48px;
    height: 48px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
