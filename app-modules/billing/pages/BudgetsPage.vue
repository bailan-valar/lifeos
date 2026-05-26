<template>
  <div class="budgets-page">
    <BudgetsTabPanel :budget-year="budgetYear" />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import BudgetsTabPanel from '../components/panels/BudgetsTabPanel.vue'

// 注入预算数据
const budgetYear = inject<Ref<number>>('budgetYear')
</script>

<style scoped>
.budgets-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
