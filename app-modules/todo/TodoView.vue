<template>
  <div class="todo-view">
    <div class="todo-header">
      <h3>待办事项 (支持父子任务)</h3>
      <div class="header-actions">
        <button class="manage-status-btn" type="button" @click="showTypeManage = true" title="管理类型">
          <Icon :name="SOLAR_ICONS.doc.folder" size="18" />
        </button>
        <button class="manage-status-btn" type="button" @click="showStatusManage = true" title="管理状态">
          <Icon :name="SOLAR_ICONS.settings.gear" size="18" />
        </button>
        <button class="add-btn" type="button" @click="addTodo">
          <Icon :name="SOLAR_ICONS.action.add" size="20" />
          添加待办
        </button>
      </div>
    </div>

    <div class="todo-list">
      <TodoItemComp
        v-for="todo in sortedTodosWithProgress"
        :key="todo.id"
        :todo="todo"
        :statuses="statuses"
        :expanded="expandedParents[todo.id] !== false"
        @toggle="toggleTodo"
        @update="updateTodoText"
        @add-child="addChildTodo"
        @delete="deleteTodo"
        @toggle-expand="toggleExpand"
        @edit="openEditDialog"
      />

      <div v-if="sortedTodos.length === 0" class="empty-state">
        <Icon :name="SOLAR_ICONS.doc.clipboard" size="48" />
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

    <!-- 类型管理对话框 -->
    <TodoTypeManager v-model:visible="showTypeManage" />

    <!-- 编辑待办弹框 -->
    <TodoEditDialog
      v-model:visible="showEditDialog"
      :todo="editingTodo"
      :available-parent-todos="availableParentTodos"
      @save="saveEdit"
      @delete="deleteEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { useModuleBase } from '~/composables/useModuleBase'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useTodoTree } from '~/composables/useTodoTree'
import { SOLAR_ICONS } from '~/composables/useIcons'
import TodoItemComp from '~/components/todo/TodoItem.vue'
import TodoStatusBadge from '~/components/todo/TodoStatusBadge.vue'
import TodoStatusManageDialog from '~/components/todo/TodoStatusManageDialog.vue'
import TodoTypeManager from '~/components/todo/TodoTypeManager.vue'
import TodoEditDialog from '~/components/todo/TodoEditDialog.vue'
import type { TodoStatus, TodoItem, TodoTreeNode } from '~/types/todo'

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
const {
  hasChildren,
  getTodoProgress,
  deleteTodoRecursive,
  clearCompleted: clearCompletedUtil,
  buildTodoTree,
  toggleTodoWithChildren,
  createTodo: createTodoUtil,
  updateTodo: updateTodoUtil
} = useTodoTree()

const todos = ref<TodoItem[]>([])
const expandedParents = ref<Record<string, boolean>>({})
const showStatusManage = ref(false)
const showTypeManage = ref(false)
const editingTodo = ref<TodoItem | null>(null)
const showEditDialog = ref(false)

// 初始化默认状态
onMounted(async () => {
  await ensureDefaultStatuses()
})

// 构建排序后的任务列表（树形结构）
const sortedTodos = computed(() => {
  return buildTodoTree(todos.value, expandedParents.value)
})

// 为每个父任务添加进度信息
const sortedTodosWithProgress = computed(() => {
  return sortedTodos.value.map(todo => {
    if (todo.hasChildren) {
      return {
        ...todo,
        progress: getTodoProgress(todos.value, todo.id)
      }
    }
    return todo
  })
})

const completedCount = computed(() => todos.value.filter((t) => t.completed).length)
const totalCount = computed(() => todos.value.length)

// 可用父任务列表（从当前笔记的任务中获取）
const availableParentTodos = computed(() => {
  // 基础列表：排除已完成的任务
  const baseList = todos.value
    .filter(t => !t.completed)
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
      const parentTask = todos.value.find(t => t.id === parentId)
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

const loadTodos = () => {
  try {
    const data = internalData.value as { todos: TodoItem[] } | undefined
    if (data?.todos && Array.isArray(data.todos)) {
      todos.value = data.todos
      // 初始化展开状态（默认展开所有父任务）
      todos.value.forEach(todo => {
        if (hasChildren(todos.value, todo.id)) {
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

const saveTodos = () => {
  try {
    handleDataChange({ todos: [...todos.value] })
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const addTodo = () => {
  const defaultStatus = getDefaultStatus()
  todos.value = createTodoUtil(todos.value, '', undefined, defaultStatus?.id)
  saveTodos()
}

const addChildTodo = (parentId: string) => {
  const defaultStatus = getDefaultStatus()
  todos.value = createTodoUtil(todos.value, '', parentId, defaultStatus?.id)
  // 自动展开父任务
  expandedParents.value[parentId] = true
  saveTodos()
}

const updateTodoText = (id: string, text: string) => {
  todos.value = updateTodoUtil(todos.value, id, { text })
  saveTodos()
}

// 打开编辑弹框
const openEditDialog = (id: string) => {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    editingTodo.value = todo
    showEditDialog.value = true
  }
}

// 保存编辑
const saveEdit = (updatedTodo: TodoItem) => {
  const index = todos.value.findIndex(t => t.id === updatedTodo.id)
  if (index !== -1) {
    todos.value[index] = updatedTodo
    saveTodos()
  }
}

// 删除编辑
const deleteEdit = (todo: TodoItem) => {
  todos.value = deleteTodoRecursive(todos.value, todo.id)
  saveTodos()
}

const toggleTodo = (id: string) => {
  todos.value = toggleTodoWithChildren(todos.value, id)
  saveTodos()
}

const toggleExpand = (id: string) => {
  expandedParents.value[id] = !expandedParents.value[id]
}

const deleteTodo = (id: string) => {
  todos.value = deleteTodoRecursive(todos.value, id)
  saveTodos()
}

const clearCompleted = () => {
  todos.value = clearCompletedUtil(todos.value)
  saveTodos()
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

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .todo-header h3 {
    color: rgba(255, 255, 255, 0.92);
  }

  .todo-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .manage-status-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
  }

  .manage-status-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);
  }

  .todo-stats {
    color: rgba(255, 255, 255, 0.6);
  }

  .clear-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
  }

  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  .todo-footer {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
