<template>
  <div class="goals-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <GoalsSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 目标Tab -->
      <div v-show="store.activeTab === 'goals'" class="tab-panel-wrapper">
        <GoalProgressDashboard :type-filter="store.activeTypeFilter" />
      </div>

      <!-- 类型管理Tab -->
      <div v-show="store.activeTab === 'types'" class="tab-panel-wrapper">
        <GoalTypesManagement />
      </div>

      <!-- 统计Tab -->
      <div v-show="store.activeTab === 'statistics'" class="tab-panel-wrapper">
        <GoalStatisticsPanel />
      </div>
    </div>

    <!-- 移动端Tab栏 -->
    <GoalsMobileTabbar v-if="isMobile" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGoalsStore } from '~/stores/goals'
import { useDevice } from '~/composables/useDevice'

// 布局组件
import GoalsSidebar from './components/layout/GoalsSidebar.vue'
import GoalsMobileTabbar from './components/layout/GoalsMobileTabbar.vue'

// 面板组件
import GoalProgressDashboard from './GoalProgressDashboard.vue'
import GoalTypesManagement from './components/panels/GoalTypesManagement.vue'
import GoalStatisticsPanel from './components/panels/GoalStatisticsPanel.vue'

const { isMobile } = useDevice()

// 导航与筛选
const store = useGoalsStore()
const { activeTab, activeTypeFilter } = storeToRefs(store)
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

.tab-panel-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content.mobile {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>