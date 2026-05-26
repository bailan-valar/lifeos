<template>
  <div class="goals-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <GoalsSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 目标Tab -->
      <div v-show="activeTab === 'goals'" class="tab-panel-wrapper">
        <GoalProgressDashboard :type-filter="activeTypeFilter" />
      </div>

      <!-- 类型管理Tab -->
      <div v-show="activeTab === 'types'" class="tab-panel-wrapper">
        <GoalTypesManagement />
      </div>

      <!-- 统计Tab -->
      <div v-show="activeTab === 'statistics'" class="tab-panel-wrapper">
        <GoalStatisticsPanel />
      </div>
    </div>

    <!-- 移动端Tab栏 -->
    <GoalsMobileTabbar v-if="isMobile" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDevice } from '~/composables/useDevice'
import { useGoalsStore, type GoalsTabId } from '~/stores/goals'

// 布局组件
import GoalsSidebar from './components/layout/GoalsSidebar.vue'
import GoalsMobileTabbar from './components/layout/GoalsMobileTabbar.vue'

// 面板组件
import GoalProgressDashboard from './GoalProgressDashboard.vue'
import GoalTypesManagement from './components/panels/GoalTypesManagement.vue'
import GoalStatisticsPanel from './components/panels/GoalStatisticsPanel.vue'

const { isMobile } = useDevice()
const route = useRoute()
const router = useRouter()
const store = useGoalsStore()

// 根据路由查询参数计算当前活跃的Tab
const activeTab = computed(() => {
  const tab = route.query.tab as string
  const validTabs = ['goals', 'types', 'statistics']
  return validTabs.includes(tab) ? tab as GoalsTabId : 'goals'
})

// 根据路由查询参数计算类型过滤器
const activeTypeFilter = computed(() => {
  const type = route.query.type as string
  const validTypes = ['all', 'short_term', 'long_term', 'habit', 'project']
  return validTypes.includes(type) ? type : 'all'
})

// 监听路由变化，同步到store（如果需要）
watch(() => route.query, (query) => {
  if (query.type) {
    store.activeTypeFilter = query.type as any
  }
}, { immediate: true })
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