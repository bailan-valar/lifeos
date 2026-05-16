<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="goal-selector-overlay" @click="close">
        <div class="goal-selector-sheet liquid-glass-sheet" @click.stop>
          <div class="sheet-header">
            <h3 class="title3">选择目标</h3>
            <button @click="close" class="liquid-glass-button close-btn">
              <Icon name="solar:close-circle-linear" size="20" />
            </button>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <span class="body">加载中...</span>
          </div>

          <div v-else-if="goals.length === 0" class="empty-state">
            <Icon name="solar:target-linear" size="48" class="empty-icon" />
            <p class="body liquid-text-secondary">暂无目标</p>
          </div>

          <div v-else class="goals-list">
            <div
              v-for="goal in sortedGoals"
              :key="goal.id"
              @click="selectGoal(goal)"
              class="goal-item liquid-glass-list-item"
            >
              <div class="goal-info">
                <div class="goal-name headline">{{ goal.title }}</div>
                <div class="goal-progress caption2 liquid-text-tertiary">
                  {{ goal.currentProgress }} / {{ goal.target }} {{ goal.unit }}
                </div>
              </div>
              <div class="goal-percentage">
                <ProgressBar
                  :current="goal.currentProgress"
                  :target="goal.target"
                  :unit="goal.unit"
                  :statistics="calculateProgressStatistics(goal)"
                  size="compact"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Goal } from '~/types/goal'
import { useGoalProgress } from '~/composables/useGoalProgress'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'select', goal: Goal): void
  (e: 'close'): void
}>()

const { goals, loading, loadGoals, calculateProgressStatistics } = useGoalProgress()

const sortedGoals = computed(() => {
  return [...goals.value].sort((a, b) => {
    const statsA = calculateProgressStatistics(a)
    const statsB = calculateProgressStatistics(b)
    return statsB.percentage - statsA.percentage
  })
})

function close() {
  emit('close')
}

function selectGoal(goal: Goal) {
  emit('select', goal)
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    await loadGoals()
  }
})
</script>

<style scoped>
.goal-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: env(safe-area-inset-bottom) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.goal-selector-sheet {
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  border-radius: var(--liquid-radius-sheet) var(--liquid-radius-sheet) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.sheet-header h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.close-btn {
  padding: 6px;
  min-width: 32px;
}

.goals-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.goal-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.goal-info {
  flex: 1;
  min-width: 0;
}

.goal-name {
  color: var(--liquid-text-primary);
  font-weight: 600;
  margin-bottom: 4px;
}

.goal-progress {
  color: var(--liquid-text-tertiary);
}

.goal-percentage {
  flex: 1;
  min-width: 120px;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .goal-selector-sheet {
    max-height: 80vh;
  }

  .goal-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .goal-percentage {
    width: 100%;
    min-width: unset;
  }
}
</style>
