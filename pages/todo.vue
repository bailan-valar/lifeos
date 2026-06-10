<template>
  <div class="todo-page">
    <!-- 背景装饰 -->
    <div class="todo-bg">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
      <div class="bg-grain" />
    </div>

    <!-- 主内容区 -->
    <div class="page-content">
      <!-- 侧边栏 -->
      <TodoSidebar
        v-model="todoStore.viewMode"
        v-model:group-by="todoStore.groupBy"
        v-model:sort-by="todoStore.sortBy"
        :stats="todoStore.stats"
        :active-statuses="todoStore.filters.status"
        :active-types="todoStore.filters.type"
        @toggle-status="handleToggleStatus"
        @clear-status="todoStore.filters.status = []"
        @toggle-type="handleToggleType"
        @clear-type="todoStore.filters.type = []"
        @manage-status="showStatusManage = true"
        @manage-type="showTypeManage = true"
      />

      <!-- 任务区 -->
      <div class="tasks-area">
        <!-- 项目视图 -->
        <TodoProjectView
          v-if="todoStore.viewMode === 'project'"
          :week-start="projectWeekStart"
          @update:week-start="projectWeekStart = $event"
        />

        <!-- 今日四象限视图 -->
        <TodoTodayMatrixView
          v-if="todoStore.viewMode === 'today'"
          :loading="todoStore.loading"
          :today-tasks="todoStore.viewTasks"
          :statuses="todoStore.statuses"
          @toggle="handleToggle"
          @delete="handleDelete"
          @update="handleUpdate"
          @edit="openEditDialog"
          @set-date="handleSetDate"
          @open-create="handleMatrixQuickAdd"
          @move-task="handleMoveTask"
        />

        <!-- 周视图 -->
        <TodoWeekView
          v-else-if="todoStore.viewMode === 'week'"
          :week-start="weekStartDate"
          @update:week-start="weekStartDate = $event"
        />

        <!-- 列表视图 -->
        <template v-else>
          <!-- 快速添加栏 -->
          <TodoQuickAddBar
            ref="quickAddRef"
            @add="handleQuickAdd"
          />

          <!-- 任务列表 -->
          <TodoMainContent
            :loading="todoStore.loading"
            :grouped-tasks="todoStore.groupedTasks"
            :empty-message="emptyMessage"
            @toggle="handleToggle"
            @delete="handleDelete"
            @update="handleUpdate"
            @reorder="handleReorder"
            @edit="openEditDialog"
            @add-child="handleAddChild"
            @set-date="handleSetDate"
          />
        </template>
      </div>
    </div>

    <!-- 状态管理对话框 -->
    <TodoStatusManageDialog v-model:visible="showStatusManage" />

    <!-- 类型管理对话框 -->
    <TodoTypeManager v-model:visible="showTypeManage" />

    <!-- 编辑待办弹框 -->
    <TodoEditDialog
      v-model:visible="showEditDialog"
      :todo="editingTodo"
      :available-parent-todos="availableParentTodos"
      :initial-data="quickAddInitialData"
      :is-creating="isCreatingTodo"
      @save="saveEdit"
      @delete="deleteEdit"
      @create="handleCreateTodo"
    />
  </div>
</template>

<script setup lang="ts">
import { useTodoStore } from '~/stores/todo'
import { useConfirm } from '~/composables/useConfirm'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useTodoTypes } from '~/composables/useTodoTypes'
import type { TodoItem } from '~/types/todo'
import TodoWeekView from '~/components/todo/TodoWeekView.vue'
import TodoProjectView from '~/components/todo/TodoProjectView.vue'
import TodoTodayMatrixView from '~/components/todo/TodoTodayMatrixView.vue'
import TodoTypeManager from '~/components/todo/TodoTypeManager.vue'
import TodoEditDialog from '~/components/todo/TodoEditDialog.vue'

// 获取本周一的日期
const getMonday = (date: Date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

definePageMeta({
  layout: 'default'
})

const { confirm } = useConfirm()

// 使用 store
const todoStore = useTodoStore()

// 状态管理
const { statuses } = useTodoStatus()
const { defaultTypes: todoTypes } = useTodoTypes()
const showStatusManage = ref(false)
const showTypeManage = ref(false)
const showEditDialog = ref(false)
const editingTodo = ref<TodoItem | null>(null)
const quickAddInitialData = ref<Partial<TodoItem> | null>(null)
const isCreatingTodo = ref(false)

const quickAddRef = ref()

// 周视图当前周的起始日期
const weekStartDate = ref(getMonday(new Date()))

// 项目视图当前周的起始日期
const projectWeekStart = ref(getMonday(new Date()))

// 计算空状态消息
const emptyMessage = computed(() => {
  switch (todoStore.viewMode) {
    case 'today':
      return '今天没有待办任务 🎉'
    case 'overdue':
      return '没有逾期任务 ✨'
    case 'important':
      return '没有高优先级任务'
    default:
      return todoStore.filters.search
        ? '没有找到匹配的任务'
        : '暂无待办任务，点击上方添加'
  }
})

// 可用父任务列表（从当前加载的任务中获取）
const availableParentTodos = computed(() => {
  // 基础列表：排除已完成的任务
  const baseList = todoStore.allTasks
    .filter(t => !t.completed && !t.statusIsCompleted)
    .map(t => ({
      id: t.id,
      text: t.text,
      parentId: t.parentId,
      completed: t.completed
    }))

  // 如果正在编辑任务，确保其父任务在列表中（即使已完成）
  if (editingTodo.value?.parentId) {
    const parentId = editingTodo.value.parentId
    if (!baseList.some(t => t.id === parentId)) {
      const parentTask = todoStore.allTasks.find(t => t.id === parentId)
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

// 切换状态筛选
const handleToggleStatus = (statusId: string) => {
  const statusArray = todoStore.filters.status || []
  const index = statusArray.indexOf(statusId)
  if (index >= 0) {
    statusArray.splice(index, 1)
  } else {
    statusArray.push(statusId)
  }
  todoStore.filters.status = statusArray
}

// 切换类型筛选
const handleToggleType = (typeId: string) => {
  const typeArray = todoStore.filters.type || []
  const index = typeArray.indexOf(typeId)
  if (index >= 0) {
    typeArray.splice(index, 1)
  } else {
    typeArray.push(typeId)
  }
  todoStore.filters.type = typeArray
}

// 快速添加任务
const handleQuickAdd = async (
  text: string,
  options: {
    dueDate?: string
    priority?: TodoItem['priority']
    typeId?: string
    statusId?: string
  }
) => {
  try {
    await todoStore.quickAdd(text, options)
  } catch (err) {
    console.error('添加任务失败:', err)
  }
}

// 四象限视图快速添加任务 - 打开创建弹框
const handleMatrixQuickAdd = (options: {
  statusId?: string
  dueDate?: string
  priority?: TodoItem['priority']
}) => {
  // 设置初始数据
  quickAddInitialData.value = {
    dueDate: options.dueDate,
    priority: options.priority,
    statusId: options.statusId
  }
  editingTodo.value = null
  isCreatingTodo.value = true
  showEditDialog.value = true
}

// 处理创建待办
const handleCreateTodo = async (todo: TodoItem) => {
  try {
    // 使用 quickAdd 创建任务（只传递支持的参数）
    await todoStore.quickAdd(todo.text, {
      dueDate: todo.dueDate,
      priority: todo.priority,
      typeId: todo.typeId,
      statusId: todo.statusId
    })
    showEditDialog.value = false
    editingTodo.value = null
    quickAddInitialData.value = null
    isCreatingTodo.value = false
  } catch (err) {
    console.error('创建任务失败:', err)
  }
}

// 切换任务完成状态
const handleToggle = async (taskId: string) => {
  try {
    await todoStore.toggleTask(taskId)
  } catch (err) {
    console.error('切换任务状态失败:', err)
  }
}

// 更新任务
const handleUpdate = async (taskId: string, text: string) => {
  try {
    await todoStore.updateTask(taskId, { text })
  } catch (err) {
    console.error('更新任务失败:', err)
  }
}

// 删除任务
const handleDelete = async (taskId: string) => {
  const ok = await confirm({
    message: '确定要删除这个任务吗？如果有子任务，它们也会被删除。',
    danger: true
  })
  if (!ok) return

  try {
    await todoStore.deleteTask(taskId)
  } catch (err) {
    console.error('删除任务失败:', err)
  }
}

// 拖拽排序
const handleReorder = async (taskId: string, targetId: string) => {
  // 这里可以实现拖拽排序的逻辑
  // 由于数据存储在笔记的 module_data 中，跨笔记拖拽比较复杂
  // 暂时只处理同笔记内的排序
  console.log('Reorder:', taskId, 'to', targetId)
}

// 添加子任务
const handleAddChild = async (parentId: string) => {
  try {
    const parentTask = todoStore.allTasks.find(t => t.id === parentId)
    if (!parentTask) return

    // 获取默认状态
    const defaultStatus = statuses.value.find(s => s.isDefault) || statuses.value[0]

    // 创建子任务
    await todoStore.createTask({
      text: '',
      parentId: parentId,
      noteId: parentTask.noteId,
      statusId: defaultStatus?.id
    })
  } catch (err) {
    console.error('添加子任务失败:', err)
  }
}

// 打开编辑弹框
const openEditDialog = async (taskId: string) => {
  try {
    const task = todoStore.allTasks.find(t => t.id === taskId)
    if (task) {
      editingTodo.value = task
      showEditDialog.value = true
    }
  } catch (err) {
    console.error('获取任务失败:', err)
  }
}

// 保存编辑
const saveEdit = async (updatedTodo: TodoItem) => {
  try {
    await todoStore.updateTask(updatedTodo.id, updatedTodo)
    showEditDialog.value = false
    editingTodo.value = null
  } catch (err) {
    console.error('保存任务失败:', err)
  }
}

// 删除编辑
const deleteEdit = async (todo: TodoItem) => {
  try {
    await todoStore.deleteTask(todo.id)
    showEditDialog.value = false
    editingTodo.value = null
  } catch (err) {
    console.error('删除任务失败:', err)
  }
}

// 设置任务日期
const handleSetDate = async (taskId: string, date: string | null) => {
  try {
    await todoStore.updateTask(taskId, { dueDate: date || undefined })
  } catch (err) {
    console.error('设置任务日期失败:', err)
  }
}

// 拖拽移动任务（今日四象限视图）
const handleMoveTask = async (taskId: string, updates: Partial<TodoItem>) => {
  try {
    await todoStore.updateTask(taskId, updates)
  } catch (err) {
    console.error('移动任务失败:', err)
  }
}

// 加载数据
onMounted(() => {
  todoStore.loadAllTasks()
  // 订阅数据变更，实现自动刷新（包括远程同步后的更新）
  todoStore.subscribeChanges()
})

// 组件卸载时取消订阅
onUnmounted(() => {
  todoStore.unsubscribeChanges()
})
</script>

<style scoped>
.todo-page {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 背景装饰 */
.todo-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.bg-blob-1 {
  top: -10%;
  left: -8%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgb(255, 138, 173) 0%, rgba(255, 138, 173, 0) 70%);
}

.bg-blob-2 {
  top: -5%;
  right: -5%;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgb(120, 174, 255) 0%, rgba(120, 174, 255, 0) 70%);
}

.bg-blob-3 {
  bottom: -15%;
  left: 30%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgb(177, 156, 255) 0%, rgba(177, 156, 255, 0) 70%);
}

@media (max-width: 767px) {
  .bg-blob-1 { width: 250px; height: 250px; }
  .bg-blob-2 { width: 280px; height: 280px; }
  .bg-blob-3 { width: 300px; height: 300px; }
}

.bg-grain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(0, 0, 0, 0.025) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
  opacity: 0.5;
}

/* 主内容区 */
.page-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 0 16px 16px 0;
  gap: 12px;
}

.tasks-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(var(--liquid-blur, 20px));
  border-radius: var(--liquid-radius, 20px);
  padding: 12px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .tasks-area {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.05));
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .page-content {
    flex-direction: column;
    padding: 0 12px 12px;
    gap: 8px;
  }

  .tasks-area {
    border-radius: var(--liquid-radius, 16px);
    padding: 10px;
  }
}
</style>
