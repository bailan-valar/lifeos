<template>
  <div class="learning-page">
    <GoalsView />
  </div>
</template>

<script setup lang="ts">
import GoalsView from '~/app-modules/goals/GoalsView.vue'
</script>

<style scoped>
.learning-page {
  height: 100%;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(102, 126, 234, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(118, 75, 162, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(74, 222, 128, 0.25) 0%, transparent 60%),
    linear-gradient(135deg, #f8f9ff 0%, #f5f3ff 50%, #f0fdf4 100%);
}
</style>
