<template>
  <div v-if="progress.hasBudget" class="budget-progress">
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
import { computed } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useBudgets } from '~/composables/useBudgets'
import { useBillCategories } from '~/composables/useBillCategories'
import { useBills } from '~/composables/useBills'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  noteId: string
}>()

const store = useBillingStore()
const { currentBudgetYear, currentBudgetMonth } = storeToRefs(store)
const { getMonthlyEquivalent } = useBudgets()
const { categories } = useBillCategories()
const { bills } = useBills()

const progress = computed(() => {
  const year = currentBudgetYear.value
  const month = currentBudgetMonth.value
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  let totalBudget = 0
  const expenseCats = categories.value.filter(c => c.type === 'expense')
  for (const cat of expenseCats) {
    totalBudget = add(totalBudget, getMonthlyEquivalent(cat.id, year, month, props.noteId))
  }

  const actualExpense = sum(bills.value
    .filter(b => b.type === 'expense' && b.status === 'completed' && b.date.startsWith(prefix))
    .map(b => b.amount))

  const hasBudget = totalBudget > 0
  const isOver = hasBudget && actualExpense > totalBudget
  const percentage = hasBudget ? Math.min(div(actualExpense, totalBudget), 1) : 0
  const rawPercentage = hasBudget ? div(actualExpense, totalBudget) : 0

  return { totalBudget, actualExpense, percentage, rawPercentage, isOver, hasBudget }
})
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
