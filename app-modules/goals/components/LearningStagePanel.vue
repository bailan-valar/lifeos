<template>
  <div class="learning-stage-panel">
    <div class="stage-header">
      <div class="stage-number">阶段 {{ stage.stageNo }}</div>
      <h3 class="stage-name">{{ stage.name }}</h3>
      <div class="stage-meta">
        <span class="stage-weeks">{{ stage.weeks }}</span>
        <span class="stage-progress">{{ stage.completedSessions }} / {{ stage.totalSessions }}</span>
      </div>
    </div>

    <p v-if="stage.description" class="stage-desc">{{ stage.description }}</p>

    <div class="stage-progress-bar">
      <div class="progress-fill" :style="{ width: `${stageProgress}%` }"></div>
    </div>

    <div v-if="stage.status === 'in_progress'" class="stage-status active">
      <Icon :name="SOLAR_ICONS.status.play" />
      <span>进行中</span>
    </div>

    <div v-if="stage.status === 'completed'" class="stage-status completed">
      <Icon :name="SOLAR_ICONS.status.success" />
      <span>已完成</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LearningStage } from '~/types/goal'
import { SOLAR_ICONS } from '~/composables/useIcons'

const props = defineProps<{
  stage: LearningStage
}>()

const stageProgress = computed(() => {
  if (props.stage.totalSessions === 0) return 0
  return Math.round((props.stage.completedSessions / props.stage.totalSessions) * 100)
})
</script>

<style scoped>
.learning-stage-panel {
  padding: 16px;
  background: var(--liquid-bg-thin);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stage-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.stage-number {
  padding: 2px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
}

.stage-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.stage-meta {
  margin-left: auto;
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.stage-desc {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
}

.stage-progress-bar {
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.3s;
}

.stage-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.stage-status.active {
  background: rgba(74, 222, 128, 0.15);
  color: #16a34a;
}

.stage-status.completed {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stage-status .icon {
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .stage-name {
    color: var(--text-primary, #f5f5f5);
  }

  .stage-progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
