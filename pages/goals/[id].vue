<template>
  <div class="goal-detail-page">
    <GoalDetailView />
  </div>
</template>

<script setup lang="ts">
import GoalDetailView from '~/app-modules/goals/GoalDetailView.vue'
</script>

<style scoped>
.goal-detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
