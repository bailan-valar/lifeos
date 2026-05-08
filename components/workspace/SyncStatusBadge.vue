<template>
  <span class="sync-badge" :class="`state-${status.state}`" :title="tooltip">
    <span class="dot" />
    <span v-if="showLabel" class="label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkspaceSyncStatus } from '~/types/workspace'

const props = defineProps<{
  status: WorkspaceSyncStatus
  showLabel?: boolean
}>()

const label = computed(() => {
  switch (props.status.state) {
    case 'active': return '同步中'
    case 'idle': return '已同步'
    case 'paused': return '已同步'
    case 'error': return '错误'
    case 'disabled':
    default: return '未配置'
  }
})

const tooltip = computed(() => {
  switch (props.status.state) {
    case 'active': return '正在同步数据…'
    case 'idle':
      return props.status.lastChangeAt
        ? `已同步 · 最近变更 ${new Date(props.status.lastChangeAt).toLocaleTimeString()}`
        : '已同步'
    case 'paused':
      return props.status.lastChangeAt
        ? `已同步 · 最近变更 ${new Date(props.status.lastChangeAt).toLocaleTimeString()}`
        : '同步就绪，实时监听变更中'
    case 'error': return props.status.lastError || '同步出错'
    case 'disabled':
    default: return '未配置 CouchDB 同步'
  }
})
</script>

<style scoped>
.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.7);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(120, 120, 128, 0.4);
  flex-shrink: 0;
}

.state-active .dot {
  background: rgb(0, 122, 255);
  box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.5);
  animation: pulse 1.4s ease-out infinite;
}

.state-idle .dot {
  background: rgb(52, 199, 89);
}

.state-paused .dot {
  background: rgb(52, 199, 89);
}

.state-error .dot {
  background: rgb(255, 59, 48);
}

.state-disabled .dot {
  background: rgba(120, 120, 128, 0.3);
}

.label {
  font-weight: 500;
  letter-spacing: -0.01em;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(0, 122, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
}
</style>
