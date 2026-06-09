<template>
  <div
    class="todo-item"
    :class="{
      'completed': todo.completed,
      'has-children': todo.hasChildren,
      'is-child': todo.level !== undefined && todo.level > 0,
      [`level-${todo.level || 0}`]: todo.level !== undefined,
      [`mode-${mode}`]: true,
      'dragging': isDragging,
      'drag-over': isDragOver,
      'has-actions': showActions
    }"
    :style="levelStyle"
    :draggable="draggable"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 拖拽手柄 (可拖拽时显示) -->
    <div v-if="draggable && !readonly" class="drag-handle">
      <Icon :name="ICONS.handle || 'solar:hamburger-menu-linear'" size="14" />
    </div>

    <!-- 展开/折叠按钮 (仅父任务，full 模式) -->
    <button
      v-if="mode === 'full' && todo.hasChildren"
      class="expand-btn"
      type="button"
      :aria-expanded="expanded"
      @click="handleToggleExpand"
    >
      <Icon
        :name="expanded ? (SOLAR_ICONS.nav.down || 'solar:alt-arrow-down-linear') : (SOLAR_ICONS.nav.right || 'solar:alt-arrow-right-linear')"
        size="14"
      />
    </button>
    <div v-else-if="mode === 'full'" class="expand-placeholder"></div>

    <!-- 勾选框 -->
    <button
      class="todo-checkbox"
      type="button"
      :aria-checked="todo.completed"
      :disabled="readonly"
      @click="handleToggle"
    >
      <Icon
        :name="todo.completed ? (SOLAR_ICONS.status.success || 'solar:check-circle-linear') : (SOLAR_ICONS.status.pending || 'solar:info-circle-linear')"
        :size="checkboxSize"
      />
    </button>

    <!-- 内容区域 -->
    <div class="todo-content">
      <!-- 文本显示 -->
      <span
        class="todo-text"
        :title="todo.text"
        @click="handleClickText"
      >
        {{ todo.text || placeholder }}
      </span>

      <!-- 状态徽章 (full 模式) -->
      <TodoStatusBadge
        v-if="mode === 'full' && todo.statusId"
        :status="getTodoStatus(todo.statusId)"
        class="todo-status"
      />

      <!-- 元信息 (compact 模式或 showMeta) -->
      <div v-if="showMetaInfo" class="todo-meta">
        <!-- 优先级 -->
        <span v-if="todo.priority && todo.priority !== 'none'" class="meta-tag priority" :class="`priority-${todo.priority}`">
          <Icon :name="priorityIcons[todo.priority] || 'solar:circle-linear'" size="10" />
        </span>
        <!-- 状态 -->
        <span v-if="todo.statusName" class="meta-tag status" :style="{ color: todo.statusColor }">
          <Icon :name="todo.statusIcon || ICONS.round" size="10" />
          {{ todo.statusName }}
        </span>
        <!-- 类型 -->
        <span v-if="todo.typeName" class="meta-tag type" :style="{ color: todo.typeColor }">
          <Icon :name="todo.typeIcon || ICONS.folder" size="10" />
          {{ todo.typeName }}
        </span>
        <!-- 截止日期 -->
        <span v-if="todo.dueDate" class="meta-tag due-date" :class="{ overdue: isOverdue(todo.dueDate) }">
          <Icon :name="ICONS.calendar || 'solar:calendar-linear'" size="10" />
          {{ formatDate(todo.dueDate) }}
        </span>
        <!-- 笔记来源 -->
        <span v-if="todo.noteTitle" class="meta-tag note">
          <Icon :name="SOLAR_ICONS.doc.text || 'solar:document-text-linear'" size="10" />
          {{ todo.noteTitle }}
        </span>
      </div>
    </div>

    <!-- 进度显示 (仅父任务，full 模式) -->
    <div v-if="mode === 'full' && todo.hasChildren && progress.text" class="todo-progress">
      <span>{{ progress.text }}</span>
    </div>

    <!-- 操作按钮 (hover 显示) -->
    <div v-if="!readonly && showActions" class="todo-actions">
      <!-- 编辑按钮 -->
      <button
        class="action-btn edit-btn"
        type="button"
        @click="handleClickText"
        :title="editButtonTitle"
      >
        <Icon :name="SOLAR_ICONS.action.edit || 'solar:pen-linear'" :size="actionIconSize" />
      </button>
      <!-- 添加子任务按钮 (full 模式) -->
      <button
        v-if="mode === 'full'"
        class="action-btn add-child-btn"
        type="button"
        @click="handleAddChild"
        :title="addButtonTitle"
      >
        <Icon :name="SOLAR_ICONS.action.add || 'solar:add-circle-linear'" :size="actionIconSize" />
      </button>
      <!-- 删除按钮 -->
      <button
        class="action-btn delete-btn"
        type="button"
        @click="handleDelete"
        title="删除"
      >
        <Icon :name="SOLAR_ICONS.action.delete || 'solar:trash-bin-trash-linear'" :size="actionIconSize" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TodoTreeNode, TodoStatus } from '~/types/todo'
import { SOLAR_ICONS, ICONS } from '~/composables/useIcons'

/**
 * 统一的待办任务项组件
 * 支持多种显示模式：full（完整功能）、compact（简洁）、readonly（只读）
 * 支持拖拽排序、双击编辑、元信息显示
 */

type TodoMode = 'full' | 'compact' | 'readonly'

// 扩展 TodoTreeNode 类型，包含可选的元信息属性
interface TodoItemProps extends TodoTreeNode {
  typeName?: string
  typeIcon?: string
  typeColor?: string
  noteTitle?: string
  statusName?: string
  statusColor?: string
  statusIcon?: string
}

interface Props {
  /** 待办任务数据 */
  todo: TodoItemProps
  /** 显示模式 */
  mode?: TodoMode
  /** 是否只读 */
  readonly?: boolean
  /** 是否显示操作按钮 */
  showActions?: boolean
  /** 是否可拖拽 */
  draggable?: boolean
  /** 是否展开（父任务） */
  expanded?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 状态列表 */
  statuses?: readonly TodoStatus[]
}

interface Emits {
  (e: 'toggle', id: string): void
  (e: 'update', id: string, text: string): void
  (e: 'add-child', id: string): void
  (e: 'delete', id: string): void
  (e: 'toggle-expand', id: string): void
  (e: 'reorder', taskId: string, targetId: string): void
  (e: 'edit', id: string): void
  (e: 'contextmenu', event: MouseEvent, todo: TodoItemProps): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'full',
  readonly: false,
  showActions: true,
  draggable: false,
  expanded: true,
  placeholder: '输入待办事项...',
  statuses: () => []
})

const emit = defineEmits<Emits>()

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 拖拽状态
const isDragging = ref(false)
const isDragOver = ref(false)

// 优先级图标
const priorityIcons: Record<string, string> = {
  high: 'solar:circle-bold',
  medium: 'solar:circle-bold',
  low: 'solar:circle-bold',
  none: 'solar:circle-linear'
}

// 计算属性
const checkboxSize = computed(() => {
  return props.mode === 'compact' ? 18 : 20
})

const actionIconSize = computed(() => {
  return props.mode === 'compact' ? 14 : 16
})

const showMetaInfo = computed(() => {
  const t = props.todo as TodoItemProps
  return !!(
    (props.mode === 'compact' && (t.typeName || t.noteTitle)) ||
    (props.mode === 'full' && (t.priority || t.statusName || t.typeName || t.dueDate || t.noteTitle))
  )
})

const levelStyle = computed(() => {
  // 在 full 模式下，缩进由 CSS 类处理
  // 在 compact/readonly 模式下，可以内联设置
  if (props.mode !== 'full' && props.todo.level) {
    return { paddingLeft: `${12 + props.todo.level * 16}px` }
  }
  return {}
})

const progress = computed(() => {
  if (!props.todo.hasChildren) return { text: '' }
  const meta = (props.todo as any).progress
  if (meta) return meta
  return { text: '' }
})

const addButtonTitle = computed(() => {
  return props.readonly ? '' : '添加子任务'
})

const editButtonTitle = computed(() => {
  return props.readonly ? '' : '编辑'
})

// 方法
const getTodoStatus = (statusId: string): TodoStatus | null => {
  return props.statuses.find(s => s.id === statusId) || null
}

// 判断是否逾期
const isOverdue = (dueDate: string) => {
  const today = formatDateLocal(new Date())
  return dueDate < today
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const today = formatDateLocal(new Date())
  const tomorrow = formatDateLocal(new Date(Date.now() + 86400000))

  if (dateStr === today) return '今天'
  if (dateStr === tomorrow) return '明天'

  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

// 点击标题打开编辑弹框
const handleClickText = () => {
  if (props.readonly) return
  emit('edit', props.todo.id)
}

const handleToggle = () => {
  if (!props.readonly) {
    emit('toggle', props.todo.id)
  }
}

const handleAddChild = () => {
  if (!props.readonly) {
    emit('add-child', props.todo.id)
  }
}

const handleDelete = () => {
  if (!props.readonly) {
    emit('delete', props.todo.id)
  }
}

const handleToggleExpand = () => {
  emit('toggle-expand', props.todo.id)
}

// 右键菜单
const handleContextMenu = (event: MouseEvent) => {
  if (props.readonly) return
  emit('contextmenu', event, props.todo)
}

// 拖拽开始
const handleDragStart = (event: DragEvent) => {
  if (!props.draggable) {
    event.preventDefault()
    return
  }
  isDragging.value = true
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.todo.id)
  }
}

// 拖拽结束
const handleDragEnd = () => {
  isDragging.value = false
  isDragOver.value = false
}

// 拖拽经过
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (props.draggable && isDragging.value) {
    isDragOver.value = true
  }
}

// 拖拽离开
const handleDragLeave = () => {
  setTimeout(() => {
    isDragOver.value = false
  }, 50)
}

// 放下
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const draggedId = event.dataTransfer?.getData('text/plain')

  if (draggedId && draggedId !== props.todo.id) {
    emit('reorder', draggedId, props.todo.id)
  }

  isDragOver.value = false
}
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.5));
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: var(--liquid-radius, 20px);
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  cursor: default;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(60, 60, 67, 0.18);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: rgba(60, 60, 67, 0.5);
}

/* 拖拽状态 */
.todo-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.todo-item.drag-over {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
}

/* 拖拽手柄 */
.drag-handle {
  color: rgba(60, 60, 67, 0.25);
  cursor: grab;
  padding: 2px;
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.todo-item:hover .drag-handle {
  color: rgba(60, 60, 67, 0.4);
}

.drag-handle:active {
  cursor: grabbing;
}

/* 层级缩进 */
.todo-item.is-child {
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
}

.todo-item.has-children {
  background: rgba(248, 248, 248, 0.7);
  border-left: 3px solid rgb(0, 122, 255);
}

/* 展开/折叠按钮 */
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

/* 勾选框 */
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
  padding: 0;
}

.todo-checkbox:hover:not(:disabled) {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.1);
}

.todo-checkbox:disabled {
  cursor: default;
  opacity: 0.7;
}

/* 内容区域 */
.todo-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-text {
  font-size: 15px;
  color: rgba(0, 0, 0, 0.92);
  cursor: pointer;
  line-height: 1.4;
}

.todo-text:hover {
  color: rgb(0, 122, 255);
}

.todo-status {
  margin-left: 4px;
  flex-shrink: 0;
}

/* 元信息标签 */
.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  background: rgba(60, 60, 67, 0.08);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
}

.meta-tag.priority-high { color: #ef4444; }
.meta-tag.priority-medium { color: #f59e0b; }
.meta-tag.priority-low { color: #22c55e; }

.meta-tag.due-date.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 进度 */
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
  flex-shrink: 0;
}

/* 操作按钮 */
.todo-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.todo-item:hover .todo-actions,
.todo-item.has-actions .todo-actions {
  opacity: 1;
}

.action-btn {
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

.action-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.edit-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

/* ============ compact 模式 ============ */
.todo-item.mode-compact {
  padding: 8px 12px;
  border-radius: 10px;
  gap: 10px;
}

.todo-item.mode-compact .todo-checkbox {
  width: 22px;
  height: 22px;
}

.todo-item.mode-compact .todo-text {
  font-size: 13px;
}

.todo-item.mode-compact .todo-content {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.todo-item.mode-compact .todo-actions {
  opacity: 1;
}

.todo-item.mode-compact .action-btn {
  width: 24px;
  height: 24px;
}

/* ============ readonly 模式 ============ */
.todo-item.mode-readonly {
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
}

.todo-item.mode-readonly:hover {
  background: rgba(60, 60, 67, 0.05);
}

.todo-item.mode-readonly .todo-text {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.75);
  cursor: default;
}

.todo-item.mode-readonly .todo-text:hover {
  color: rgba(60, 60, 67, 0.75);
}

/* ============ 层级样式 ============ */
.todo-item.level-1 {
  margin-left: 4px;
}

.todo-item.level-2 {
  margin-left: 8px;
}

.todo-item.level-3 {
  margin-left: 12px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .todo-item {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .todo-item:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .todo-item.completed .todo-text {
    color: rgba(255, 255, 255, 0.4);
  }

  .todo-text {
    color: rgba(255, 255, 255, 0.92);
  }

  .todo-checkbox {
    color: rgba(255, 255, 255, 0.5);
  }

  .expand-btn {
    color: rgba(255, 255, 255, 0.5);
  }

  .drag-handle {
    color: rgba(255, 255, 255, 0.25);
  }

  .todo-item:hover .drag-handle {
    color: rgba(255, 255, 255, 0.4);
  }

  .todo-item.is-child {
    background: rgba(255, 255, 255, 0.05);
  }

  .todo-item.has-children {
    background: rgba(255, 255, 255, 0.1);
    border-left-color: rgb(0, 122, 255);
  }

  .meta-tag {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
  }

  .action-btn {
    color: rgba(255, 255, 255, 0.5);
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .delete-btn:hover {
    background: rgba(255, 59, 48, 0.1);
    color: rgb(255, 59, 48);
  }
}
</style>
