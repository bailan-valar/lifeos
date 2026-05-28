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
          <h3 class="group-title">{{ group.title }}</h3>
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
          />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import TodoItem from './TodoItem.vue'
import type { TaskGroup } from '~/types/todo'

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

// 处理拖拽排序
const handleReorder = (taskId: string, targetId: string) => {
  emit('reorder', taskId, targetId)
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

.group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
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

  .group-count {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>
