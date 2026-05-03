<template>
  <div class="todo-view">
    <div class="todo-header">
      <h3>待办事项</h3>
      <button class="add-btn" type="button" @click="addTodo">
        <Icon name="solar:add-circle-linear" size="20" />
        添加待办
      </button>
    </div>

    <div class="todo-list">
      <div
        v-for="todo in sortedTodos"
        :key="todo.id"
        class="todo-item"
        :class="{ completed: todo.completed }"
      >
        <button
          class="todo-checkbox"
          type="button"
          :aria-checked="todo.completed"
          @click="toggleTodo(todo.id)"
        >
          <Icon
            :name="todo.completed ? 'solar:check-circle-linear' : 'solar:circle-linear'"
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
  </div>
</template>

<script setup lang="ts">
import { useModuleBase } from '~/composables/useModuleBase'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
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

const todos = ref<TodoItem[]>([])

const sortedTodos = computed(() => {
  return [...todos.value].sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    return a.completed ? 1 : -1
  })
})

const completedCount = computed(() => todos.value.filter((t) => t.completed).length)
const totalCount = computed(() => todos.value.length)

const loadTodos = () => {
  try {
    const data = internalData.value as { todos: TodoItem[] } | undefined
    if (data?.todos && Array.isArray(data.todos)) {
      todos.value = data.todos
    } else {
      todos.value = []
    }
    markReady()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const addTodo = () => {
  const newTodo: TodoItem = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    text: '',
    completed: false,
    createdAt: new Date().toISOString()
  }
  todos.value.push(newTodo)
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
    todo.completed = !todo.completed
    saveTodos()
  }
}

const deleteTodo = (id: string) => {
  todos.value = todos.value.filter((t) => t.id !== id)
  saveTodos()
}

const clearCompleted = () => {
  todos.value = todos.value.filter((t) => !t.completed)
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
  gap: 10px;
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
