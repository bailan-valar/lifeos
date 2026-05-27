<template>
  <div class="todo-view">
    <div class="todo-header">
      <h3>待办事项 (支持父子任务)</h3>
      <div class="header-actions">
        <button class="manage-status-btn" type="button" @click="showStatusManage = true" title="管理状态">
          <Icon name="solar:settings-linear" size="18" />
        </button>
        <button class="add-btn" type="button" @click="addTodo">
          <Icon name="solar:add-circle-linear" size="20" />
          添加待办
        </button>
      </div>
    </div>

    <div class="todo-list">
      <div
        v-for="todo in sortedTodos"
        :key="todo.id"
        class="todo-item"
        :class="{
          completed: todo.completed,
          'has-children': todo.hasChildren,
          'is-child': todo.parentId
        }"
        :style="{ paddingLeft: todo.parentId ? `${32 + (getDepth(todo.id) * 20)}px` : '12px' }"
      >
        <!-- 展开/折叠按钮 (仅父任务) -->
        <button
          v-if="todo.hasChildren"
          class="expand-btn"
          type="button"
          @click="toggleExpand(todo.id)"
        >
          <Icon
            :name="expandedParents[todo.id] ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'"
            size="16"
          />
        </button>
        <div v-else class="expand-placeholder"></div>

        <button
          class="todo-checkbox"
          type="button"
          :aria-checked="todo.completed"
          @click="toggleTodo(todo.id)"
        >
          <Icon
            :name="todo.completed ? 'solar:check-circle-linear' : 'solar:round-linear'"
            size="20"
          />
        </button>

        <input
          v-model="todo.text"
          class="todo-input"
          type="text"
          placeholder="输入待办事项..."
          @blur="updateTodo(todo)"
          @keydown.enter.prevent="updateTodo(todo)"
        />

        <!-- 状态显示 -->
        <TodoStatusBadge
          v-if="todo.statusId"
          :status="getTodoStatus(todo.statusId)"
          class="todo-status"
        />

        <!-- 进度显示 (仅父任务) -->
        <div v-if="todo.hasChildren" class="todo-progress">
          <span>{{ getTodoProgress(todo.id) }}</span>
        </div>

        <!-- 添加子任务按钮 -->
        <button class="add-child-btn" type="button" @click="addChildTodo(todo.id)">
          <Icon name="solar:add-circle-linear" size="16" />
        </button>

        <button class="delete-btn" type="button" @click="deleteTodo(todo.id)">
          <Icon name="solar:trash-bin-minimalistic-linear" size="16" />
        </button>
      </div>

      <div v-if="sortedTodos.length === 0" class="empty-state">
        <Icon name="solar:clipboard-list-linear" size="48" />
        <p>暂无待办事项</p>
        <button class="empty-add-btn" type="button" @click="addTodo">
          添加第一个待办
        </button>
      </div>
    </div>

    <div class="todo-footer">
      <div class="todo-stats">
        <span>{{ completedCount }} / {{ totalCount }} 已完成</span>
      </div>
      <button
        v-if="completedCount > 0"
        class="clear-btn"
        type="button"
        @click="clearCompleted"
      >
        清除已完成
      </button>
    </div>

    <!-- 状态管理对话框 -->
    <TodoStatusManageDialog v-model:visible="showStatusManage" />
  </div>
</template>

<script setup lang="ts">
import { useModuleBase } from '~/composables/useModuleBase'
import { useTodoStatus } from '~/composables/useTodoStatus'
import TodoStatusBadge from '~/components/todo/TodoStatusBadge.vue'
import TodoStatusManageDialog from '~/components/todo/TodoStatusManageDialog.vue'
import type { TodoStatus } from '~/types/todo'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
  hasChildren?: boolean
  statusId?: string
}

interface ModuleBaseProps {
  noteId: string
  moduleData?: { todos: TodoItem[] } | undefined
  onDataChange?: (data: unknown) => void
}

const props = defineProps<ModuleBaseProps>()

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'error', error: Error): void
  (e: 'data-change', data: unknown): void
}>()

const { internalData, handleDataChange, handleError, markReady } = useModuleBase(props, emit)
const { statuses, getDefaultStatus, ensureDefaultStatuses } = useTodoStatus()

const todos = ref<TodoItem[]>([])
const expandedParents = ref<Record<string, boolean>>({})
const showStatusManage = ref(false)

// 初始化默认状态
onMounted(async () => {
  await ensureDefaultStatuses()
})

// 获取任务深度（用于缩进）
const getDepth = (id: string, depth = 0): number => {
  const todo = todos.value.find((t) => t.id === id)
  if (!todo?.parentId) return depth
  return getDepth(todo.parentId, depth + 1)
}

// 获取子任务列表
const getChildren = (parentId: string): TodoItem[] => {
  return todos.value.filter((t) => t.parentId === parentId)
}

// 检查任务是否有子任务
const hasChildren = (id: string): boolean => {
  return todos.value.some((t) => t.parentId === id)
}

// 获取待办状态
const getTodoStatus = (statusId: string): TodoStatus | null => {
  return statuses.value.find(s => s.id === statusId) || null
}

// 获取父任务的完成进度
const getTodoProgress = (parentId: string): string => {
  const children = getChildren(parentId)
  if (children.length === 0) return ''
  const completed = children.filter((t) => t.completed).length
  return `${completed}/${children.length}`
}

// 构建排序后的任务列表（树形结构）
const sortedTodos = computed(() => {
  const result: TodoItem[] = []
  const rootTodos = todos.value.filter((t) => !t.parentId).sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return a.completed ? 1 : -1
  })

  const buildTree = (todo: TodoItem) => {
    const children = getChildren(todo.id)
    const todoWithMeta = { ...todo, hasChildren: children.length > 0 }
    result.push(todoWithMeta)

    // 如果展开或有子任务，递归添加子任务
    if (children.length > 0 && expandedParents.value[todo.id] !== false) {
      children.sort((a, b) => {
        if (a.completed === b.completed) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return a.completed ? 1 : -1
      }).forEach(child => buildTree(child))
    }
  }

  rootTodos.forEach(todo => buildTree(todo))
  return result
})

const completedCount = computed(() => todos.value.filter((t) => t.completed).length)
const totalCount = computed(() => todos.value.length)

const loadTodos = () => {
  try {
    const data = internalData.value as { todos: TodoItem[] } | undefined
    if (data?.todos && Array.isArray(data.todos)) {
      todos.value = data.todos
      // 初始化展开状态（默认展开所有父任务）
      todos.value.forEach(todo => {
        if (hasChildren(todo.id)) {
          expandedParents.value[todo.id] = true
        }
      })
    } else {
      todos.value = []
    }
    markReady()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const addTodo = () => {
  const defaultStatus = getDefaultStatus()
  const newTodo: TodoItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    text: '',
    completed: false,
    createdAt: new Date().toISOString(),
    statusId: defaultStatus?.id
  }
  todos.value.push(newTodo)
  saveTodos()
}

const addChildTodo = (parentId: string) => {
  const defaultStatus = getDefaultStatus()
  const newTodo: TodoItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    text: '',
    completed: false,
    createdAt: new Date().toISOString(),
    parentId,
    statusId: defaultStatus?.id
  }
  todos.value.push(newTodo)
  // 自动展开父任务
  expandedParents.value[parentId] = true
  saveTodos()
}

const updateTodo = (todo: TodoItem) => {
  const index = todos.value.findIndex((t) => t.id === todo.id)
  if (index !== -1) {
    todos.value[index] = { ...todo }
    saveTodos()
  }
}

const toggleTodo = (id: string) => {
  const todo = todos.value.find((t) => t.id === id)
  if (todo) {
    const newCompletedState = !todo.completed
    todo.completed = newCompletedState

    // 如果是父任务，同时更新所有子任务的完成状态
    if (hasChildren(id)) {
      updateChildrenCompletion(id, newCompletedState)
    }

    // 如果是子任务，检查父任务是否应该被标记为完成
    if (todo.parentId) {
      updateParentCompletion(todo.parentId)
    }

    saveTodos()
  }
}

// 递归更新子任务完成状态
const updateChildrenCompletion = (parentId: string, completed: boolean) => {
  const children = getChildren(parentId)
  children.forEach(child => {
    child.completed = completed
    if (hasChildren(child.id)) {
      updateChildrenCompletion(child.id, completed)
    }
  })
}

// 递归检查并更新父任务完成状态
const updateParentCompletion = (parentId: string) => {
  const children = getChildren(parentId)
  const parent = todos.value.find((t) => t.id === parentId)

  if (parent && children.length > 0) {
    const allCompleted = children.every((t) => t.completed)
    parent.completed = allCompleted

    // 继续向上检查
    if (parent.parentId) {
      updateParentCompletion(parent.parentId)
    }
  }
}

const toggleExpand = (id: string) => {
  expandedParents.value[id] = !expandedParents.value[id]
}

const deleteTodo = (id: string) => {
  // 递归删除所有子任务
  const deleteRecursive = (todoId: string) => {
    const children = getChildren(todoId)
    children.forEach(child => deleteRecursive(child.id))
    const index = todos.value.findIndex((t) => t.id === todoId)
    if (index !== -1) {
      todos.value.splice(index, 1)
    }
  }

  deleteRecursive(id)

  // 如果删除的是子任务，检查父任务是否还需要显示
  const deletedTodo = todos.value.find((t) => t.id === id) || { parentId: undefined }
  if (deletedTodo.parentId) {
    const parent = todos.value.find((t) => t.id === deletedTodo.parentId)
    if (parent && !hasChildren(parent.id)) {
      // 父任务不再有子任务，但保留父任务
    }
  }

  saveTodos()
}

const clearCompleted = () => {
  // 只删除已完成的根任务及其子任务
  const deleteRecursive = (todoId: string) => {
    const children = getChildren(todoId)
    children.forEach(child => deleteRecursive(child.id))
    const index = todos.value.findIndex((t) => t.id === todoId)
    if (index !== -1) {
      todos.value.splice(index, 1)
    }
  }

  const completedRootTodos = todos.value.filter((t) => t.completed && !t.parentId)
  completedRootTodos.forEach(todo => deleteRecursive(todo.id))

  saveTodos()
}

const saveTodos = () => {
  try {
    handleDataChange({ todos: [...todos.value] })
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

watch(() => props.moduleData, (newData) => {
  if (newData) {
    loadTodos()
  }
}, { immediate: true })

defineExpose({
  addTodo,
  addChildTodo,
  clearCompleted
})
</script>

<style scoped>
.todo-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 16px;
}

.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.todo-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.manage-status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.6);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.manage-status-btn:hover {
  background: rgba(60, 60, 67, 0.15);
  color: rgba(60, 60, 67, 0.8);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.add-btn:hover {
  background: rgb(0, 110, 250);
}

.add-btn:active {
  transform: scale(0.96);
}

.todo-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(60, 60, 67, 0.18);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-input {
  text-decoration: line-through;
  color: rgba(60, 60, 67, 0.5);
}

.todo-item.is-child {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  margin-left: 20px;
}

.todo-item.has-children {
  background: rgba(248, 248, 248, 0.7);
  border-left: 3px solid rgb(0, 122, 255);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s ease, background-color 0.15s ease;
  flex-shrink: 0;
}

.expand-btn:hover {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.1);
}

.expand-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.todo-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s ease, background-color 0.15s ease;
  flex-shrink: 0;
}

.todo-checkbox:hover {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.1);
}

.todo-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  padding: 4px 0;
  outline: none;
}

.todo-input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.todo-progress {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgb(0, 122, 255);
  white-space: nowrap;
}

.todo-status {
  margin-left: 4px;
}

.add-child-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.add-child-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.empty-add-btn {
  padding: 10px 20px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.empty-add-btn:hover {
  background: rgb(0, 110, 250);
}

.todo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.todo-stats {
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
}

.clear-btn {
  padding: 8px 16px;
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clear-btn:hover {
  background: rgba(60, 60, 67, 0.16);
}
</style>
