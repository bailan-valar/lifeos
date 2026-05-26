<template>
  <nav class="billing-mobile-tabbar">
    <button
      v-for="tab in store.mobileTabs"
      :key="tab.id"
      type="button"
      class="billing-tab-item"
      :class="{ active: activeTab === tab.id }"
      @click="navigateToTab(tab.id)"
    >
      <Icon :name="tab.icon" size="20" />
      <span>{{ tab.name }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBillingStore } from '~/stores/billing'

const router = useRouter()
const route = useRoute()
const store = useBillingStore()

// 从当前路由路径确定活跃的Tab
const activeTab = computed(() => {
  const path = route.path
  if (path.includes('/billing/bills')) return 'bills'
  if (path.includes('/billing/accounts')) return 'accounts'
  if (path.includes('/billing/categories')) return 'categories'
  if (path.includes('/billing/budgets')) return 'budgets'
  return 'bills'
})

// 导航到指定路由
function navigateToTab(tabId: string) {
  const routeMap = {
    bills: '/billing/bills',
    accounts: '/billing/accounts',
    categories: '/billing/categories',
    budgets: '/billing/budgets'
  }
  router.push(routeMap[tabId as keyof typeof routeMap] || '/billing/bills')
}
</script>

<style scoped>
/* 移动端底部 Tab Bar */
.billing-mobile-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-shrink: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-top: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: var(--z-drawer);
  position: relative;
  overflow: hidden;
}

/* Liquid Glass 折射高光 */
.billing-mobile-tabbar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.billing-tab-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;
}

.billing-tab-item.active {
  color: rgb(0, 122, 255);
}

.billing-tab-item:active {
  opacity: 0.7;
}
</style>
