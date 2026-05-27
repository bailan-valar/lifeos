# 待办编辑组件集成指南

## 快速开始

### 1. 基本集成

在您的页面或组件中添加待办编辑功能：

```vue
<template>
  <div>
    <button @click="openCreateDialog">新建待办</button>
    
    <TodoEditDialog
      v-model:visible="showDialog"
      @create="handleCreate"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import TodoEditDialog from '~/components/todo/TodoEditDialog.vue'

const showDialog = ref(false)

const openCreateDialog = () => {
  showDialog.value = true
}

const handleCreate = (newTodo) => {
  console.log('新待办已创建:', newTodo)
}

const handleSave = (updatedTodo) => {
  console.log('待办已更新:', updatedTodo)
}
</script>
```

### 2. 与现有待办列表集成

```vue
<template>
  <div>
    <!-- 待办列表 -->
    <div v-for="todo in todos" :key="todo.id" class="todo-item">
      <input type="checkbox" v-model="todo.completed" />
      <span>{{ todo.text }}</span>
      <button @click="editTodo(todo)">编辑</button>
    </div>
    
    <button @click="createNewTodo">新建待办</button>
    
    <!-- 编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showDialog"
      :todo="editingTodo"
      @create="addToTodoList"
      @save="updateTodoList"
    />
  </div>
</template>

<script setup>
import { useTodos } from '~/composables/useTodos'

const { todos, addTodo, updateTodo } = useTodos()
const showDialog = ref(false)
const editingTodo = ref(null)

const createNewTodo = () => {
  editingTodo.value = null
  showDialog.value = true
}

const editTodo = (todo) => {
  editingTodo.value = { ...todo }
  showDialog.value = true
}

const addToTodoList = (newTodo) => {
  addTodo(newTodo)
}

const updateTodoList = (updatedTodo) => {
  updateTodo(updatedTodo)
}
</script>
```

### 3. 支持子任务功能

```vue
<template>
  <div>
    <div v-for="todo in rootTodos" :key="todo.id">
      <div class="parent-todo">
        <span>{{ todo.text }}</span>
        <button @click="createChildTodo(todo.id)">添加子任务</button>
        <button @click="editTodo(todo)">编辑</button>
      </div>
      
      <!-- 子任务列表 -->
      <div v-for="child in getChildTodos(todo.id)" :key="child.id" class="child-todo">
        <span>{{ child.text }}</span>
        <button @click="editTodo(child)">编辑</button>
      </div>
    </div>
    
    <!-- 编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showDialog"
      :todo="editingTodo"
      :parent-id="parentId"
      :available-parent-todos="availableParentTodos"
      @create="handleCreate"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
const editingTodo = ref(null)
const parentId = ref('')

// 可用作父任务的待办（未完成的根任务）
const availableParentTodos = computed(() => {
  return todos.value.filter(todo => !todo.completed && !todo.parentId)
})

const createChildTodo = (parentTodoId) => {
  editingTodo.value = null
  parentId.value = parentTodoId
  showDialog.value = true
}

const getChildTodos = (parentId) => {
  return todos.value.filter(todo => todo.parentId === parentId)
}
</script>
```

## 组合式函数集成

如果您的项目使用了组合式函数，可以这样集成：

### 创建待办管理 Composable

```typescript
// composables/useTodoEdit.ts
import { ref } from 'vue'

export function useTodoEdit() {
  const showDialog = ref(false)
  const editingTodo = ref(null)
  const parentId = ref('')

  const openCreateDialog = (parentTodoId = '') => {
    editingTodo.value = null
    parentId.value = parentTodoId
    showDialog.value = true
  }

  const openEditDialog = (todo) => {
    editingTodo.value = { ...todo }
    parentId.value = ''
    showDialog.value = true
  }

  const closeDialog = () => {
    showDialog.value = false
    editingTodo.value = null
    parentId.value = ''
  }

  return {
    showDialog,
    editingTodo,
    parentId,
    openCreateDialog,
    openEditDialog,
    closeDialog
  }
}
```

### 在组件中使用

```vue
<template>
  <div>
    <button @click="openCreateDialog()">新建待办</button>
    <button @click="openCreateDialog(todo.id)">添加子任务</button>
    <button @click="openEditDialog(todo)">编辑</button>
    
    <TodoEditDialog
      v-model:visible="showDialog"
      :todo="editingTodo"
      :parent-id="parentId"
      @create="handleCreate"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { useTodoEdit } from '~/composables/useTodoEdit'

const {
  showDialog,
  editingTodo,
  parentId,
  openCreateDialog,
  openEditDialog
} = useTodoEdit()
</script>
```

## 数据库集成

组件已经内置了数据库操作，使用 `~/services/db` 中的数据库服务：

```typescript
import { getDB, generateId, now } from '~/services/db'

// 组件内部会自动处理：
// - db.todos.insert() - 创建新待办
// - db.todos.upsert() - 更新现有待办
// - db.todo_types.find() - 获取待办类型列表
```

## 样式定制

### 全局样式覆盖

```css
/* 在您的全局样式文件中 */
.todo-edit-dialog .modal-content {
  max-width: 600px; /* 修改对话框宽度 */
}

.todo-edit-dialog .primary-btn {
  background: #your-color; /* 修改主色调 */
}
```

### 组件级样式

```vue
<style scoped>
/* 使用深度选择器 */
.todo-edit-dialog :deep(.content-textarea) {
  min-height: 120px;
}
</style>
```

## 错误处理

组件内置了基本的错误处理，但您可以添加自定义错误处理：

```vue
<TodoEditDialog
  v-model:visible="showDialog"
  @create="(todo) => {
    try {
      handleCreate(todo)
      showToast('待办创建成功')
    } catch (error) {
      showToast('创建失败：' + error.message)
    }
  }"
/>
```

## 性能优化

### 大列表优化

如果待办列表很大，建议：

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

// 异步加载编辑对话框
const TodoEditDialog = defineAsyncComponent(() => 
  import('~/components/todo/TodoEditDialog.vue')
)
</script>
```

### 防抖处理

对于频繁的编辑操作，可以添加防抖：

```vue
<script setup>
import { debounce } from 'lodash-es'

const debouncedSave = debounce((updatedTodo) => {
  updateTodoList(updatedTodo)
}, 300)
</script>
```

## 常见问题

### Q: 如何自定义待办类型的显示？
A: 组件会自动从数据库加载待办类型，您可以通过 `TodoTypeManager` 组件管理类型。

### Q: 如何验证待办内容？
A: 组件已经内置了基本验证（内容不能为空），如需更多验证，监听 `create` 和 `save` 事件。

### Q: 支持键盘快捷键吗？
A: 是的，在文本框中按 Enter 键可以提交表单。

## 升级指南

如果您从旧版本的待办编辑组件升级：

1. **API 变化**：
   - `content` 字段改为 `text` 字段
   - 移除了 `priority`, `dueDate`, `dueTime`, `description` 字段
   - 新增了 `typeId` 字段

2. **事件变化**：
   - `confirm` 事件改为 `create` 和 `save` 事件
   - `cancel` 事件改为 `update:visible` 事件

3. **迁移步骤**：
   ```vue
   <!-- 旧版本 -->
   <TodoEditDialog
     :visible="showDialog"
     @confirm="handleConfirm"
     @cancel="handleCancel"
   />
   
   <!-- 新版本 -->
   <TodoEditDialog
     v-model:visible="showDialog"
     @create="handleCreate"
     @save="handleSave"
   />
   ```