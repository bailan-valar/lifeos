<template>
  <div class="goals-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <GoalsSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <NuxtPage />
    </div>

    <!-- 移动端Tab栏 -->
    <GoalsMobileTabbar v-if="isMobile" />
  </div>
</template>

<script setup lang="ts">
import { useDevice } from '~/composables/useDevice'

// 布局组件
import GoalsSidebar from './components/layout/GoalsSidebar.vue'
import GoalsMobileTabbar from './components/layout/GoalsMobileTabbar.vue'

const { isMobile } = useDevice()
</script>

<style scoped>
.goals-view {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
}

.goals-view.mobile {
  flex-direction: column;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.content.mobile {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>