<template>
  <div class="mobile-tabbar">
    <button
      v-for="tab in store.mobileTabs"
      :key="tab.id"
      type="button"
      class="tabbar-btn"
      :class="{ active: isActiveTab(tab.id) }"
      @click="navigateToTab(tab.id)"
    >
      <Icon :name="tab.icon" size="20" />
      <span class="tabbar-label">{{ tab.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGoalsStore } from '~/stores/goals'

const router = useRouter()
const route = useRoute()
const store = useGoalsStore()

// 根据路由查询参数计算当前活跃的Tab
const activeTab = computed(() => {
  const tab = route.query.tab as string
  const validTabs = ['goals', 'types', 'statistics']
  return validTabs.includes(tab) ? tab : 'goals'
})

// 判断是否是当前Tab
function isActiveTab(tabId: string) {
  return activeTab.value === tabId
}

// 导航到指定Tab（通过查询参数）
function navigateToTab(tabId: string) {
  router.push({ path: '/goals', query: { tab: tabId } })
}
</script>

<style scoped>
.mobile-tabbar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0;
  background: var(--liquid-bg-thick);
  backdrop-filter: blur(var(--liquid-blur-thick));
  border-top: var(--liquid-border);
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.tabbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 60px;
}

.tabbar-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 60, 67, 0.7);
}

.tabbar-btn.active {
  color: rgb(0, 122, 255);
}

.tabbar-label {
  font-size: 10px;
  line-height: 1.2;
}
</style>