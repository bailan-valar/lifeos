<template>
  <div class="todo-edit-example">
    <div class="example-section">
      <h3>待办编辑组件使用示例</h3>
      
      <div class="button-group">
        <!-- 新建根待办 -->
        <button class="demo-btn" @click="openCreateTodo" type="button">
          <Icon name="solar:add-circle-linear" />
          <span>新建待办</span>
        </button>
        
        <!-- 新建子待办 -->
        <button class="demo-btn secondary" @click="openCreateChildTodo" type="button">
          <Icon name="solar:file-minus-linear" />
          <span>新建子待办</span>
        </button>
        
        <!-- 编辑现有待办 -->
        <button class="demo-btn secondary" @click="openEditTodo" type="button" :disabled="!selectedTodo">
          <Icon name="solar:pen-2-linear" />
          <span>编辑待办</span>
        </button>
      </div>
      
      <!-- 待办列表 -->
      <div class="todo-list">
        <div 
          v-for="todo in todos" 
          :key="todo.id"
          class="todo-item"
          :class="{ selected: selectedTodo?.id === todo.id }"
          @click="selectTodo(todo)"
        >
          <div class="todo-content">
            <span class="todo-text">{{ todo.text }}</span>
            <div class="todo-meta">
              <span v-if="todo.typeId" class="type-badge">
                {{ todo.typeId }}
              </span>
              <span v-if="todo.parentId" class="child-badge">
                子任务
              </span>
            </div>
          </div>
          <div class="todo-actions">
            <button class="action-btn" @click.stop="editTodoDirect(todo)" type="button">
              <Icon name="solar:pen-2-linear" size="16" />
            </button>
            <button class="action-btn danger" @click.stop="deleteTodo(todo.id)" type="button">
              <Icon name="solar:trash-bin-trash-linear" size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 待办编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showEditDialog"
      :todo="editingTodo"
      :parent-id="parentId"
      :available-parent-todos="availableParentTodos"
      @save="handleTodoSaved"
      @create="handleTodoCreated"
    />
  </div>
</template>

<script setup lang="ts">
import TodoEditDialog from './TodoEditDialog.vue'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
  typeId?: string // 待办类型ID
}

// 示例数据
const todos = ref<TodoItem[]>([
  {
    id: '1',
    text: '完成项目报告',
    completed: false,
    typeId: 'work',
    createdAt: '2026-05-27T10:00:00Z'
  },
  {
    id: '2',
    text: '准备会议材料',
    completed: false,
    typeId: 'urgent',
    parentId: '1',
    createdAt: '2026-05-27T11:00:00Z'
  },
  {
    id: '3',
    text: '团队建设活动',
    completed: true,
    typeId: 'personal',
    createdAt: '2026-05-27T09:00:00Z'
  }
])

// 对话框状态
const showEditDialog = ref(false)
const editingTodo = ref<TodoItem | null>(null)
const parentId = ref<string>('')
const selectedTodo = ref<TodoItem | null>(null)

// 可用作父任务的待办列表（排除已完成和子任务）
const availableParentTodos = computed(() => {
  return todos.value.filter(todo =>
    !todo.completed && !todo.parentId
  )
})

// 打开新建待办对话框
const openCreateTodo = () => {
  editingTodo.value = null
  parentId.value = ''
  showEditDialog.value = true
}

// 打开新建子待办对话框
const openCreateChildTodo = () => {
  if (selectedTodo.value) {
    editingTodo.value = null
    parentId.value = selectedTodo.value.id
    showEditDialog.value = true
  } else {
    // 如果没有选中待办，提示用户先选择
    alert('请先选择一个父任务')
  }
}

// 打开编辑待办对话框
const openEditTodo = () => {
  if (selectedTodo.value) {
    editTodoDirect(selectedTodo.value)
  }
}

// 直接编辑指定待办
const editTodoDirect = (todo: TodoItem) => {
  editingTodo.value = { ...todo }
  parentId.value = ''
  showEditDialog.value = true
}

// 选择待办
const selectTodo = (todo: TodoItem) => {
  selectedTodo.value = selectedTodo.value?.id === todo.id ? null : todo
}

// 处理待办保存（编辑模式）
const handleTodoSaved = (updatedTodo: TodoItem) => {
  const index = todos.value.findIndex(t => t.id === updatedTodo.id)
  if (index !== -1) {
    todos.value[index] = updatedTodo
  }
  selectedTodo.value = null
}

// 处理待办创建（新建模式）
const handleTodoCreated = (newTodo: TodoItem) => {
  todos.value.push(newTodo)
}

// 删除待办
const deleteTodo = (todoId: string) => {
  if (confirm('确定要删除这个待办吗？')) {
    const index = todos.value.findIndex(t => t.id === todoId)
    if (index !== -1) {
      todos.value.splice(index, 1)
    }
    if (selectedTodo.value?.id === todoId) {
      selectedTodo.value = null
    }
  }
}
</script>

<style scoped>
.todo-edit-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.example-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.example-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.demo-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.demo-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.demo-btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.demo-btn.secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.demo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.todo-item:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.todo-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-weight: 500;
  color: #111827;
  display: block;
  margin-bottom: 4px;
}

.todo-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #dbeafe;
  color: #1e40af;
}

.child-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #fef3c7;
  color: #92400e;
}

.todo-actions {
  display: flex;
  gap: 4px;
  margin-left: 12px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

@media (max-width: 640px) {
  .button-group {
    flex-direction: column;
  }
  
  .demo-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>