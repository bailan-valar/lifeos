<template>
  <div 
    v-if="status"
    class="todo-status-badge"
    :style="{ backgroundColor: `${status.color}20`, color: status.color }"
    :title="status.description || status.name"
  >
    <Icon :name="status.icon || ICONS.round" size="12" />
    <span class="status-name">{{ status.name }}</span>
  </div>
  <div v-else class="todo-status-badge placeholder">
    <Icon :name="ICONS.round" size="12" />
    <span class="status-name">无状态</span>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import type { TodoStatus } from '~/types/todo'

interface Props {
  status: TodoStatus | null | undefined
}

const props = defineProps<Props>()
</script>

<style scoped>
.todo-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.todo-status-badge:hover {
  transform: scale(1.05);
  cursor: pointer;
}

.todo-status-badge.placeholder {
  background: rgba(156, 163, 175, 0.1);
  color: rgba(156, 163, 175, 0.8);
}

.status-name {
  line-height: 1;
}
</style>