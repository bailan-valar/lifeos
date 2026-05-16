<template>
  <div class="budget-progress">
    <div class="budget-progress-header">
      <span class="budget-progress-label">预算执行</span>
      <span class="budget-progress-value" :class="{ over: progress.isOver }">
        {{ progress.actualExpense.toFixed(0) }} / {{ progress.totalBudget.toFixed(0) }}
        <template v-if="progress.isOver">
          (超支 {{ (progress.rawPercentage * 100 - 100).toFixed(0) }}%)
        </template>
        <template v-else>
          ({{ (progress.rawPercentage * 100).toFixed(0) }}%)
        </template>
      </span>
    </div>
    <div class="budget-progress-track">
      <div
        class="budget-progress-fill"
        :class="{ over: progress.isOver }"
        :style="{ width: `${progress.percentage * 100}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface BudgetProgress {
  totalBudget: number
  actualExpense: number
  percentage: number
  rawPercentage: number
  isOver: boolean
  hasBudget: boolean
}

defineProps<{
  progress: BudgetProgress
}>()
</script>

<style scoped>
.budget-progress {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.budget-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.budget-progress-label {
  color: rgba(60, 60, 67, 0.5);
}

.budget-progress-value {
  color: rgba(0, 0, 0, 0.78);
  font-weight: 500;
}

.budget-progress-value.over {
  color: rgb(255, 59, 48);
}

.budget-progress-track {
  height: 6px;
  background: rgba(60, 60, 67, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.budget-progress-fill {
  height: 100%;
  background: rgb(0, 122, 255);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.budget-progress-fill.over {
  background: rgb(255, 59, 48);
}
</style>
