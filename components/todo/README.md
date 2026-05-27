# 待办编辑组件 (TodoEditDialog)

一个可复用的待办事项编辑组件，支持新建和编辑待办事项。

## 功能特性

- ✨ **双模式支持**：同时支持新建和编辑待办事项
- 🎯 **待办类型**：支持选择待办类型（需要配合待办类型管理）
- 🌳 **父子关系**：支持创建子待办事项
- 📱 **响应式设计**：完美适配桌面和移动设备
- 🎨 **美观界面**：现代化的UI设计
- ⚡ **即时保存**：直接操作数据库，无需手动管理状态

## 基础用法

```vue
<template>
  <div>
    <!-- 新建待办按钮 -->
    <button @click="openCreateDialog">新建待办</button>
    
    <!-- 待办编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showDialog"
      :todo="currentTodo"
      @save="handleSave"
      @create="handleCreate"
    />
  </div>
</template>

<script setup>
import TodoEditDialog from '~/components/todo/TodoEditDialog.vue'

const showDialog = ref(false)
const currentTodo = ref(null)

// 打开新建对话框
const openCreateDialog = () => {
  currentTodo.value = null
  showDialog.value = true
}

// 处理保存（编辑模式）
const handleSave = (updatedTodo) => {
  console.log('待办已更新:', updatedTodo)
  // 更新你的待办列表
}

// 处理创建（新建模式）
const handleCreate = (newTodo) => {
  console.log('新待办已创建:', newTodo)
  // 添加到你的待办列表
}
</script>
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | `false` | 控制对话框显示/隐藏（支持 v-model） |
| `todo` | `TodoItem \| null` | `null` | 要编辑的待办事项，为 null 时为新建模式 |
| `parentId` | `string` | `''` | 预设的父任务ID，用于创建子任务 |
| `availableParentTodos` | `TodoItem[]` | `[]` | 可选的父任务列表 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `update:visible` | `value: boolean` | 对话框显示状态变化 |
| `save` | `todo: TodoItem` | 保存待办事项（编辑模式） |
| `create` | `todo: TodoItem` | 创建新待办事项（新建模式） |

## 高级用法

### 创建子任务

```vue
<template>
  <button @click="createChildTodo(parentId)">创建子任务</button>
  
  <TodoEditDialog
    v-model:visible="showDialog"
    :parent-id="selectedParentId"
    @create="handleCreate"
  />
</template>

<script setup>
const selectedParentId = ref('')

const createChildTodo = (parentId) => {
  selectedParentId.value = parentId
  showDialog.value = true
}
</script>
```

### 编辑现有待办

```vue
<template>
  <button @click="editTodo(todo)">编辑</button>
  
  <TodoEditDialog
    v-model:visible="showDialog"
    :todo="editingTodo"
    @save="handleSave"
  />
</template>

<script setup>
const editingTodo = ref(null)

const editTodo = (todo) => {
  editingTodo.value = { ...todo } // 创建副本
  showDialog.value = true
}

const handleSave = (updatedTodo) => {
  // 更新列表中的待办
  const index = todos.findIndex(t => t.id === updatedTodo.id)
  if (index !== -1) {
    todos[index] = updatedTodo
  }
}
</script>
```

### 提供父任务选择

```vue
<template>
  <TodoEditDialog
    v-model:visible="showDialog"
    :available-parent-todos="parentTodoOptions"
    @create="handleCreate"
  />
</template>

<script setup>
// 只提供未完成的根任务作为父任务选项
const parentTodoOptions = computed(() => {
  return todos.value.filter(todo => 
    !todo.completed && !todo.parentId
  )
})
</script>
```

## 数据结构

### TodoItem

```typescript
interface TodoItem {
  id: string                    // 唯一标识
  text: string                  // 待办内容
  completed: boolean            // 完成状态
  createdAt: string            // 创建时间
  parentId?: string            // 父任务ID
  typeId?: string              // 待办类型ID
}
```

## 样式定制

组件使用了 scoped 样式，如需定制样式，可以通过 CSS 变量或深度选择器：

```css
/* 修改对话框宽度 */
.todo-edit-dialog .modal-content {
  max-width: 600px;
}

/* 修改主色调 */
.todo-edit-dialog .primary-btn {
  background: #your-color;
}
```

## 依赖项

- `~/services/db` - 数据库服务
- `~/components/SelectPicker.vue` - 选择器组件（如使用类型选择等功能）
- `Icon` - 图标组件

## 注意事项

1. **数据库操作**：组件会直接操作数据库中的 `todos` 表
2. **类型管理**：待办类型功能需要配合 `TodoTypeManager` 组件使用
3. **表单验证**：待办内容为必填项，其他字段为可选项
4. **日期格式**：日期使用 `YYYY-MM-DD` 格式，时间使用 `HH:mm` 格式

## 示例项目

完整的使用示例请参考 `TodoEditDialog.example.vue` 文件。

## 更新日志

### v1.0.0 (2026-05-27)
- ✨ 初始版本
- 🎯 支持新建/编辑待办
- 📅 支持日期时间设置
- 🔥 支持优先级设置
- 🌳 支持父子任务关系