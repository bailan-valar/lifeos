<template>
  <div class="goals-page">
    <GoalsView />
  </div>
</template>

<script setup lang="ts">
import GoalsView from '~/app-modules/goals/GoalsView.vue'
</script>

<style scoped>
.goals-page {
  height: 100%;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}
</style>