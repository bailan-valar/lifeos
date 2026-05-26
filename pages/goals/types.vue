<template>
  <div class="goals-types-page">
    <GoalTypesManagement />
  </div>
</template>

<script setup lang="ts">
import GoalTypesManagement from '~/app-modules/goals/components/panels/GoalTypesManagement.vue'

useHead({
  title: '目标类型管理 - LifeOS'
})
</script>

<style scoped>
.goals-types-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>