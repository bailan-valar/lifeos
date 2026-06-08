<template>
  <div class="learning-goal-card" :class="{ completed: goal.status === 'completed' }" @click="onClick">
    <div class="card-header">
      <div class="dimension-badge" :style="{ backgroundColor: dimensionColor }">
        {{ dimensionName }}
      </div>
      <div class="status-indicator" :class="`status-${goal.status}`"></div>
    </div>

    <h3 class="goal-title">{{ goal.title }}</h3>
    <p v-if="goal.description" class="goal-desc">{{ goal.description }}</p>

    <div class="card-stats">
      <div class="stat-item">
        <Icon :name="SOLAR_ICONS.time.clock" />
        <span>{{ goal.estimatedWeeks }} 周</span>
      </div>
      <div class="stat-item">
        <Icon :name="SOLAR_ICONS.doc.notebook" />
        <span>{{ goal.totalSessions }} 课时</span>
      </div>
      <div class="stat-item">
        <Icon :name="SOLAR_ICONS.layer.layers" />
        <span>{{ goal.totalStages }} 阶段</span>
      </div>
    </div>

    <div class="card-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
      </div>
      <div class="progress-text">
        <span>{{ goal.completedSessions }} / {{ goal.totalSessions }}</span>
        <span>{{ progressPercentage }}%</span>
      </div>
    </div>

    <div v-if="goal.status === 'in_progress'" class="current-stage">
      <Icon :name="SOLAR_ICONS.status.play" />
      <span>进行中</span>
    </div>

    <div v-if="goal.status === 'completed'" class="completion-badge">
      <Icon :name="SOLAR_ICONS.status.success" />
      <span>已完成</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LearningGoal } from '~/types/goal'
import { LEARNING_DIMENSIONS } from '~/composables/useLearning'
import { SOLAR_ICONS } from '~/composables/useIcons'

const props = defineProps<{
  goal: LearningGoal
}>()

const emit = defineEmits<{
  click: [goal: LearningGoal]
}>()

const dimensionName = computed(() => {
  return LEARNING_DIMENSIONS[props.goal.dimension]?.name || '学习'
})

const dimensionColor = computed(() => {
  const color = LEARNING_DIMENSIONS[props.goal.dimension]?.color
  return color ? `${color}20` : 'rgba(102, 126, 234, 0.2)'
})

const progressPercentage = computed(() => {
  if (props.goal.totalSessions === 0) return 0
  return Math.round((props.goal.completedSessions / props.goal.totalSessions) * 100)
})

function onClick() {
  emit('click', props.goal)
}
</script>

<style scoped>
.learning-goal-card {
  position: relative;
  padding: 16px;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border-radius: var(--liquid-radius);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.learning-goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.learning-goal-card.completed {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dimension-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.status-pending {
  background: #999;
}

.status-indicator.status-in_progress {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.status-indicator.status-completed {
  background: #667eea;
}

.status-indicator.status-paused {
  background: #fbbf24;
}

.goal-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.4;
}

.goal-desc {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.stat-item .icon {
  font-size: 14px;
}

.card-progress {
  margin-bottom: 10px;
}

.progress-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary, #666);
}

.current-stage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(74, 222, 128, 0.15);
  border-radius: 8px;
  font-size: 12px;
  color: #16a34a;
}

.current-stage .icon {
  font-size: 14px;
}

.completion-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  font-size: 12px;
  color: white;
}

.completion-badge .icon {
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .learning-goal-card {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .goal-title {
    color: var(--text-primary, #f5f5f5);
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }

  .dimension-badge {
    color: #f5f5f5;
  }
}
</style>
