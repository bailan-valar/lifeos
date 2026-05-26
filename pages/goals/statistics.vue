<template>
  <div class="goals-statistics-page">
    <GoalStatisticsPanel />
  </div>
</template>

<script setup lang="ts">
import GoalStatisticsPanel from '~/app-modules/goals/components/panels/GoalStatisticsPanel.vue'

useHead({
  title: '目标统计 - LifeOS'
})
</script>

<style scoped>
.goals-statistics-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>