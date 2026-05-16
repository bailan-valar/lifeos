<template>
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-label">收入</span>
      <span class="stat-value positive">+{{ income.toFixed(2) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">支出</span>
      <span class="stat-value negative">-{{ expense.toFixed(2) }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">结余</span>
      <span class="stat-value" :class="balance >= 0 ? 'positive' : 'negative'">
        {{ balance >= 0 ? '+' : '' }}{{ balance.toFixed(2) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  income: number
  expense: number
  balance: number
}>()
</script>

<style scoped>
.stats-bar {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
}

.stat-value.positive {
  color: rgb(52, 199, 89);
}

.stat-value.negative {
  color: rgb(255, 59, 48);
}
</style>
