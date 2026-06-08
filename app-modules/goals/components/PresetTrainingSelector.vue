<template>
  <div class="preset-training-selector">
    <h3>选择训练计划</h3>
    <p class="selector-desc">从预设的训练计划中快速开始</p>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- 训练维度列表 -->
    <div v-else class="dimensions-grid">
      <div
        v-for="dimension in dimensions"
        :key="dimension.id"
        class="dimension-card"
        :style="{ '--accent-color': dimension.color }"
        @click="handleSelect(dimension.id)"
      >
        <div class="card-header">
          <div class="dimension-color" :style="{ backgroundColor: dimension.color }"></div>
          <h4>{{ dimension.name }}</h4>
        </div>
        <p class="dimension-desc">{{ dimension.description }}</p>
        <div class="dimension-meta">
          <span class="sessions-count">{{ dimension.sessions }} 个课时</span>
          <Icon :name="SOLAR_ICONS.nav.right" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAvailableTrainingDimensions, createGoalFromTrainingData } from '~/app-modules/goals/data/init-training-data'
import { useLearningGoals, useLearningStages, useLearningSessions } from '~/composables/useLearning'
import { SOLAR_ICONS } from '~/composables/useIcons'

const emit = defineEmits<{
  select: [goalId: string]
  close: []
}>()

const loading = ref(true)
const dimensions = ref<Array<{ id: string; name: string; color: string; description: string; sessions: number }>>([])

const { createGoal } = useLearningGoals()
const { createStage } = useLearningStages()
const { createSession } = useLearningSessions()

onMounted(async () => {
  try {
    dimensions.value = await getAvailableTrainingDimensions()
  } catch (e) {
    console.error('Failed to load training dimensions:', e)
  } finally {
    loading.value = false
  }
})

async function handleSelect(dimensionId: string) {
  const goal = await createGoalFromTrainingData(
    dimensionId,
    createGoal,
    createStage,
    createSession
  )

  if (goal) {
    emit('select', goal.id)
  }
}
</script>

<style scoped>
.preset-training-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.selector-desc {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.dimension-card {
  position: relative;
  padding: 16px;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.dimension-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-color);
  opacity: 0;
  transition: opacity 0.2s;
}

.dimension-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.dimension-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.dimension-color {
  width: 24px;
  height: 24px;
  border-radius: 8px;
}

.card-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.dimension-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dimension-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sessions-count {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.dimension-meta .icon {
  font-size: 16px;
  color: var(--text-tertiary, #999);
}

@media (prefers-color-scheme: dark) {
  h3 {
    color: var(--text-primary, #f5f5f5);
  }

  .dimension-card {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .card-header h4 {
    color: var(--text-primary, #f5f5f5);
  }
}
</style>
