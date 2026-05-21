<template>
  <div class="progress-bar-container" :class="[`size-${size}`, `status-${status}`]">
    <div class="progress-track liquid-glass-thin">
      <div
        class="progress-fill"
        :style="{ width: `${Math.min(percentage, 100)}%` }"
      >
        <div class="progress-shimmer"></div>
      </div>
    </div>
    <div class="progress-label">
      <span class="label-text caption1">{{ current }} / {{ target }} {{ unit }}</span>
      <span class="label-percentage caption1">{{ Math.min(percentage, 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProgressStatistics } from '~/types/goal'

const props = withDefaults(
  defineProps<{
    current?: number
    target?: number
    unit?: string
    size?: 'compact' | 'standard' | 'large'
    statistics?: ProgressStatistics
  }>(),
  {
    current: 0,
    target: 0,
    unit: '',
    size: 'standard',
    statistics: undefined
  }
)

const safeCurrent = computed(() => typeof props.current === 'number' && !isNaN(props.current) ? props.current : 0)
const safeTarget = computed(() => typeof props.target === 'number' && !isNaN(props.target) ? props.target : 0)

const percentage = computed(() => {
  if (safeTarget.value === 0) return 0
  return (safeCurrent.value / safeTarget.value) * 100
})

const status = computed(() => {
  if (!props.statistics) {
    if (percentage.value >= 100) return 'completed'
    return 'default'
  }

  return props.statistics.progressStatus
})
</script>

<style scoped>
.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

/* 尺寸变体 */
.size-compact {
  gap: 4px;
}

.size-compact .progress-track {
  height: 6px;
}

.size-compact .progress-label {
  flex-direction: row;
  justify-content: space-between;
}

.size-standard .progress-track {
  height: 10px;
}

.size-large .progress-track {
  height: 14px;
}

.size-large .progress-label {
  flex-direction: column;
  gap: 4px;
}

/* 进度条轨道 */
.progress-track {
  position: relative;
  width: 100%;
  border-radius: var(--liquid-radius-input);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.05);
}

/* 进度条填充 */
.progress-fill {
  position: relative;
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.progress-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
}

/* 状态颜色 */
.status-behind .progress-fill {
  background: linear-gradient(90deg, rgb(255, 149, 0), rgb(255, 204, 0));
}

.status-on-track .progress-fill {
  background: linear-gradient(90deg, rgb(0, 122, 255), rgb(52, 199, 89));
}

.status-ahead .progress-fill {
  background: linear-gradient(90deg, rgb(52, 199, 89), rgb(48, 209, 88));
}

.status-completed .progress-fill {
  background: linear-gradient(90deg, rgb(52, 199, 89), rgb(34, 197, 94));
  box-shadow: 0 0 20px rgba(52, 199, 89, 0.5);
}

.status-default .progress-fill {
  background: linear-gradient(90deg, rgb(0, 122, 255), rgb(52, 199, 89));
}

/* 光泽效果 */
.progress-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* 进度标签 */
.progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.label-text {
  color: var(--liquid-text-secondary);
  font-weight: 500;
}

.label-percentage {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

/* 状态对应的标签颜色 */
.status-behind .label-percentage {
  color: rgb(255, 149, 0);
}

.status-on-track .label-percentage {
  color: rgb(0, 122, 255);
}

.status-ahead .label-percentage {
  color: rgb(52, 199, 89);
}

.status-completed .label-percentage {
  color: rgb(52, 199, 89);
}
</style>
