<template>
  <div class="sidebar" :class="{ collapsed: store.sidebarCollapsed }">
    <button
      type="button"
      class="sidebar-toggle"
      :title="store.sidebarCollapsed ? '展开' : '收起'"
      @click="store.toggleSidebar()"
    >
      <Icon
        :name="store.sidebarCollapsed ? 'solar:double-alt-arrow-right-linear' : 'solar:double-alt-arrow-left-linear'"
        size="16"
      />
    </button>

    <template v-for="tab in store.tabs" :key="tab.id">
      <!-- 账户Tab -->
      <template v-if="tab.id === 'accounts'">
        <button
          type="button"
          class="sidebar-btn"
          :class="{ active: activeTab === 'accounts' }"
          :title="store.sidebarCollapsed ? tab.name : ''"
          @click="handleAccountsClick"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!store.sidebarCollapsed"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: store.accountsMenuExpanded }"
          />
        </button>
        <div
          v-if="!store.sidebarCollapsed && store.accountsMenuExpanded"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in store.accountSubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: activeTab === 'accounts' && store.activeAccountSubTab === sub.type }"
            @click="handleAccountSubTabClick(sub.type)"
          >
            {{ sub.label }}
          </button>
        </div>
      </template>

      <!-- 分类Tab -->
      <template v-else-if="tab.id === 'categories'">
        <button
          type="button"
          class="sidebar-btn"
          :class="{ active: activeTab === 'categories' }"
          :title="store.sidebarCollapsed ? tab.name : ''"
          @click="handleCategoriesClick"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!store.sidebarCollapsed"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: store.categoryMenuExpanded }"
          />
        </button>
        <div
          v-if="!store.sidebarCollapsed && store.categoryMenuExpanded"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in store.categorySubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: activeTab === 'categories' && store.activeCategorySubTab === sub.type }"
            @click="handleCategorySubTabClick(sub.type)"
          >
            <span class="sub-dot" :class="sub.type" />
            {{ sub.label }}
          </button>
        </div>
      </template>

      <!-- 预算Tab -->
      <template v-else-if="tab.id === 'budgets'">
        <button
          type="button"
          class="sidebar-btn"
          :class="{ active: activeTab === 'budgets' }"
          :title="store.sidebarCollapsed ? tab.name : ''"
          @click="handleBudgetsClick"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!store.sidebarCollapsed"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: store.budgetMenuExpanded }"
          />
        </button>
        <div
          v-if="!store.sidebarCollapsed && store.budgetMenuExpanded"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in store.budgetSubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: activeTab === 'budgets' && store.activeBudgetSubTab === sub.type }"
            @click="handleBudgetSubTabClick(sub.type)"
          >
            {{ sub.label }}
          </button>
        </div>
      </template>

      <!-- 其他Tab（账单、规则） -->
      <button
        v-else
        type="button"
        class="sidebar-btn"
        :class="{ active: activeTab === tab.id }"
        :title="store.sidebarCollapsed ? tab.name : ''"
        @click="navigateToTab(tab.id)"
      >
        <Icon :name="tab.icon" size="18" />
        <span class="sidebar-btn-text">{{ tab.name }}</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBillingStore, type BillingAccountType, type BillingCategoryType, type BillingBudgetType } from '~/stores/billing'

const router = useRouter()
const route = useRoute()
const store = useBillingStore()

// 从当前路由查询参数确定活跃的Tab
const activeTab = computed(() => {
  const tab = route.query.tab as string
  const validTabs = ['bills', 'accounts', 'categories', 'budgets', 'rules']
  return validTabs.includes(tab) ? tab : 'bills'
})

// 导航到指定Tab（通过查询参数）
function navigateToTab(tabId: string) {
  router.push({ path: '/billing', query: { tab: tabId } })
}

// 处理账户Tab点击
function handleAccountsClick() {
  if (activeTab.value === 'accounts') {
    store.accountsMenuExpanded = !store.accountsMenuExpanded
  } else {
    navigateToTab('accounts')
    store.accountsMenuExpanded = true
  }
}

// 处理分类Tab点击
function handleCategoriesClick() {
  if (activeTab.value === 'categories') {
    store.categoryMenuExpanded = !store.categoryMenuExpanded
  } else {
    navigateToTab('categories')
    store.categoryMenuExpanded = true
  }
}

// 处理账户子Tab点击
function handleAccountSubTabClick(type: BillingAccountType) {
  navigateToTab('accounts')
  store.activeAccountSubTab = type
}

// 处理分类子Tab点击
function handleCategorySubTabClick(type: BillingCategoryType) {
  navigateToTab('categories')
  store.activeCategorySubTab = type
}

// 处理预算Tab点击
function handleBudgetsClick() {
  if (activeTab.value === 'budgets') {
    store.budgetMenuExpanded = !store.budgetMenuExpanded
  } else {
    navigateToTab('budgets')
    store.budgetMenuExpanded = true
  }
}

// 处理预算子Tab点击
function handleBudgetSubTabClick(type: BillingBudgetType) {
  navigateToTab('budgets')
  store.activeBudgetSubTab = type
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 160px;
  padding: 40px 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-right: 0.5px solid rgba(60, 60, 67, 0.08);
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow-y: auto;
  position: relative;
}

.sidebar.collapsed {
  width: 52px;
  padding: 40px 4px 12px;
}

.sidebar-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.sidebar:hover .sidebar-toggle {
  opacity: 1;
}

.sidebar-toggle:hover {
  background: rgba(0, 0, 0, 0.06);
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  position: relative;
}

.sidebar-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 60, 67, 0.9);
}

.sidebar-btn.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.sidebar.collapsed .sidebar-btn {
  justify-content: center;
  padding: 8px;
}

.sidebar-btn-text {
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .sidebar-btn-text {
  display: none;
}

.submenu-chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
  color: rgba(60, 60, 67, 0.3);
}

.submenu-chevron.expanded {
  transform: rotate(180deg);
}

.sidebar.collapsed .submenu-chevron {
  display: none;
}

.sidebar-submenu {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 8px;
  margin-left: 12px;
  border-left: 1.5px solid rgba(60, 60, 67, 0.06);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sidebar-submenu-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.sidebar-submenu-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: rgba(60, 60, 67, 0.8);
}

.sidebar-submenu-btn.active {
  color: rgb(0, 122, 255);
  font-weight: 500;
}

.sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sub-dot.income {
  background: rgb(52, 199, 89);
}

.sub-dot.expense {
  background: rgb(255, 59, 48);
}
</style>
