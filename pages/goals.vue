<template>
  <div class="goals-page">
    <GoalProgressDashboard />
  </div>
</template>

<script setup lang="ts">
import GoalProgressDashboard from '~/app-modules/goals/GoalProgressDashboard.vue'

// 设置页面头部信息
useHead({
  title: '目标进度 - LifeOS'
})
</script>

<style scoped>
.goals-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
