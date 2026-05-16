<template>
  <div :class="['goal-status-badge', `status-${status}`, `size-${size}`]">
    <Icon :name="iconName" :size="iconSize" />
    <span>{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ProgressStatus } from '~/types/goal'

const props = withDefaults(
  defineProps<{
    status: ProgressStatus
    size?: 'compact' | 'standard'
  }>(),
  {
    size: 'standard'
  }
)

const statusText = computed(() => {
  const textMap = {
    behind: '落后',
    on_track: '正常',
    ahead: '超前',
    completed: '已完成'
  }
  return textMap[props.status]
})

const iconName = computed(() => {
  const iconMap = {
    behind: 'solar:danger-circle-linear',
    on_track: 'solar:check-circle-linear',
    ahead: 'solar:bolts-linear',
    completed: 'solar:check-read-linear'
  }
  return iconMap[props.status]
})

const iconSize = computed(() => {
  return props.size === 'compact' ? 14 : 16
})
</script>

<style scoped>
.goal-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--liquid-radius-button);
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(var(--liquid-blur));
  border: 0.5px solid transparent;
  transition: all 0.15s ease;
}

.size-compact {
  padding: 3px 8px;
  font-size: 11px;
  gap: 3px;
}

/* 状态样式 */
.status-behind {
  background: rgba(255, 149, 0, 0.15);
  color: rgb(255, 149, 0);
  border-color: rgba(255, 149, 0, 0.3);
}

.status-on-track {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.3);
}

.status-ahead {
  background: rgba(52, 199, 89, 0.15);
  color: rgb(52, 199, 89);
  border-color: rgba(52, 199, 89, 0.3);
}

.status-completed {
  background: rgba(52, 199, 89, 0.2);
  color: rgb(52, 199, 89);
  border-color: rgba(52, 199, 89, 0.4);
  box-shadow: 0 0 12px rgba(52, 199, 89, 0.3);
}
</style>
