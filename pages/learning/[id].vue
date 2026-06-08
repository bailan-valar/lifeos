<template>
  <div class="learning-detail-page">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import LearningDetailView from '~/app-modules/goals/LearningDetailView.vue'
</script>

<style scoped>
.learning-detail-page {
  height: 100%;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(102, 126, 234, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(118, 75, 162, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(74, 222, 128, 0.25) 0%, transparent 60%),
    linear-gradient(135deg, #f8f9ff 0%, #f5f3ff 50%, #f0fdf4 100%);
}
</style>
