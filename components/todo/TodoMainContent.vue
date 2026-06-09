<template>
  <main class="todo-main-content">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <Icon :name="ICONS.loading" size="32" class="loading-icon" />
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="Object.keys(groupedTasks).length === 0" class="empty-state">
      <Icon name="solar:clipboard-list-linear" size="48" />
      <p>{{ emptyMessage }}</p>
    </div>

    <!-- 任务列表 -->
    <div v-else class="task-list">
      <div
        v-for="group in groupArray"
        :key="group.id"
        class="task-group"
      >
        <!-- 分组标题 -->
        <div class="group-header">
          <div class="group-title-wrapper">
            <h3 class="group-title">{{ group.title }}</h3>
            <!-- 笔记类标签 -->
            <span
              v-if="group.classInfo"
              class="class-tag"
              :style="{ '--tag-color': group.classInfo.color }"
            >
              <Icon :name="group.classInfo.icon" size="14" />
              {{ group.classInfo.name }}
            </span>
          </div>
          <span class="group-count">{{ group.completedCount }} / {{ group.count }}</span>
        </div>

        <!-- 任务项 -->
        <div class="task-items">
          <TodoItem
            v-for="task in group.tasks"
            :key="task.id"
            :todo="task"
            :mode="'compact'"
            :draggable="true"
            @toggle="(id) => $emit('toggle', id)"
            @update="(id, text) => $emit('update', id, text)"
            @delete="(id) => $emit('delete', id)"
            @reorder="(taskId, targetId) => $emit('reorder', taskId, targetId)"
            @edit="(id) => $emit('edit', id)"
            @contextmenu="handleContextMenu"
          />
        </div>
      </div>
    </div>

    <!-- 待办右键菜单 -->
    <TodoContextMenu
      v-model:visible="contextMenuVisible"
      :todo="contextMenuTodo"
      :x="contextMenuX"
      :y="contextMenuY"
      @toggle-complete="handleToggleComplete"
      @edit="handleMenuEdit"
      @add-child="handleMenuAddChild"
      @view-detail="handleMenuViewDetail"
      @delete="handleMenuDelete"
      @set-date="handleMenuSetDate"
    />
  </main>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import TodoItem from './TodoItem.vue'
import TodoContextMenu from './TodoContextMenu.vue'
import type { TaskGroup } from '~/types/todo'
import type { TodoItem as TodoItemType } from '~/types/todo'

interface Props {
  loading?: boolean
  groupedTasks?: Record<string, TaskGroup>
  emptyMessage?: string
}

interface Emits {
  (e: 'toggle', id: string): void
  (e: 'delete', id: string): void
  (e: 'update', id: string, text: string): void
  (e: 'reorder', taskId: string, targetId: string): void
  (e: 'edit', id: string): void
  (e: 'add-child', id: string): void
  (e: 'set-date', id: string, date: string | null): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  groupedTasks: () => ({}),
  emptyMessage: '暂无待办任务'
})

const emit = defineEmits<Emits>()

// 转换为数组并保持顺序
const groupArray = computed(() => {
  return Object.values(props.groupedTasks)
})

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuTodo = ref<{ id: string; text: string; completed: boolean; parentId?: string; noteId?: string } | null>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 处理拖拽排序
const handleReorder = (taskId: string, targetId: string) => {
  emit('reorder', taskId, targetId)
}

// 右键菜单处理
const handleContextMenu = (event: MouseEvent, todo: TodoItemType) => {
  contextMenuTodo.value = todo
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

// 右键菜单 - 切换完成状态
const handleToggleComplete = (todo: { id: string; text: string; completed: boolean }) => {
  emit('toggle', todo.id)
}

// 右键菜单 - 编辑
const handleMenuEdit = (todo: { id: string }) => {
  emit('edit', todo.id)
}

// 右键菜单 - 添加子任务
const handleMenuAddChild = (todo: { id: string }) => {
  emit('add-child', todo.id)
}

// 右键菜单 - 查看详情
const handleMenuViewDetail = (todo: { id: string }) => {
  emit('edit', todo.id)
}

// 右键菜单 - 删除
const handleMenuDelete = (todo: { id: string }) => {
  emit('delete', todo.id)
}

// 右键菜单 - 设置日期
const handleMenuSetDate = (todo: { id: string }, date: string | null) => {
  emit('set-date', todo.id, date)
}
</script>

<style scoped>
.todo-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 任务列表 */
.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.group-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
}

/* 笔记类标签 */
.class-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--tag-color, #007AFF) 15%, transparent);
  color: var(--tag-color, #007AFF);
  border: 1px solid color-mix(in srgb, var(--tag-color, #007AFF) 30%, transparent);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.group-count {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  padding: 2px 8px;
  background: rgba(60, 60, 67, 0.08);
  border-radius: 10px;
}

/* 任务项容器 */
.task-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 滚动条样式 */
.task-list::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track {
  background: transparent;
}

.task-list::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .group-title {
    color: rgba(255, 255, 255, 0.8);
  }

  .class-tag {
    background: color-mix(in srgb, var(--tag-color, #007AFF) 20%, transparent);
    border-color: color-mix(in srgb, var(--tag-color, #007AFF) 40%, transparent);
  }

  .group-count {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>
