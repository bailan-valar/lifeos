<template>
  <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
    <button
      type="button"
      class="sidebar-toggle"
      :title="sidebarCollapsed ? '展开' : '收起'"
      @click="$emit('toggle-sidebar')"
    >
      <Icon
        :name="sidebarCollapsed ? 'solar:double-alt-arrow-right-linear' : 'solar:double-alt-arrow-left-linear'"
        size="16"
      />
    </button>

    <template v-for="tab in tabs" :key="tab.id">
      <!-- 账户Tab -->
      <template v-if="tab.id === 'accounts'">
        <button
          type="button"
          class="sidebar-btn"
          :class="{ active: activeTab === 'accounts' }"
          :title="sidebarCollapsed ? tab.name : ''"
          @click="$emit('accounts-tab-click')"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!sidebarCollapsed"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: accountsMenuExpanded }"
          />
        </button>
        <div
          v-if="!sidebarCollapsed && accountsMenuExpanded"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in accountSubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: activeTab === 'accounts' && activeAccountSubTab === sub.type }"
            @click="$emit('account-sub-tab-change', sub.type)"
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
          :title="sidebarCollapsed ? tab.name : ''"
          @click="$emit('categories-tab-click')"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!sidebarCollapsed"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: categoryMenuExpanded }"
          />
        </button>
        <div
          v-if="!sidebarCollapsed && categoryMenuExpanded"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in categorySubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: activeTab === 'categories' && activeCategorySubTab === sub.type }"
            @click="$emit('category-sub-tab-change', sub.type)"
          >
            <span class="sub-dot" :class="sub.type" />
            {{ sub.label }}
          </button>
        </div>
      </template>

      <!-- 其他Tab（账单、预算、规则） -->
      <button
        v-else
        type="button"
        class="sidebar-btn"
        :class="{ active: activeTab === tab.id }"
        :title="sidebarCollapsed ? tab.name : ''"
        @click="$emit('tab-change', tab.id)"
      >
        <Icon :name="tab.icon" size="18" />
        <span class="sidebar-btn-text">{{ tab.name }}</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TabId } from '~/types/bill'

type AccountType = 'personal' | 'contact' | 'merchant' | 'other'
type CategoryType = 'income' | 'expense'

interface Tab {
  id: TabId
  name: string
  icon: string
}

const props = defineProps<{
  activeTab: TabId
  activeAccountSubTab: AccountType
  activeCategorySubTab: CategoryType | 'all'
  sidebarCollapsed: boolean
  accountsMenuExpanded: boolean
  categoryMenuExpanded: boolean
}>()

defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'accounts-tab-click'): void
  (e: 'categories-tab-click'): void
  (e: 'account-sub-tab-change', type: AccountType): void
  (e: 'category-sub-tab-change', type: CategoryType): void
  (e: 'tab-change', id: TabId): void
}>()

const tabs: Tab[] = [
  { id: 'bills' as TabId, name: '账单', icon: 'solar:wallet-money-linear' },
  { id: 'accounts' as TabId, name: '账户', icon: 'solar:wallet-linear' },
  { id: 'categories' as TabId, name: '分类', icon: 'solar:folder-linear' },
  { id: 'budgets' as TabId, name: '预算', icon: 'solar:chart-2-linear' },
  { id: 'rules' as TabId, name: '规则', icon: 'solar:filter-linear' }
]

const accountSubTabs = [
  { type: 'personal' as AccountType, label: '个人账户' },
  { type: 'contact' as AccountType, label: '人员/组织' },
  { type: 'merchant' as AccountType, label: '商户' },
  { type: 'other' as AccountType, label: '其他' }
]

const categorySubTabs = [
  { type: 'income' as CategoryType, label: '收入' },
  { type: 'expense' as CategoryType, label: '支出' }
]
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 160px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-right: 0.5px solid rgba(60, 60, 67, 0.08);
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 48px;
  padding: 12px 6px;
  align-items: center;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  align-self: flex-end;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-toggle:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
}

.sidebar.collapsed .sidebar-toggle {
  align-self: center;
  margin-bottom: 8px;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  white-space: nowrap;
}

.sidebar-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sidebar.collapsed .sidebar-btn {
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
}

.sidebar-btn-text {
  transition: opacity 0.15s ease;
}

.sidebar.collapsed .sidebar-btn-text {
  display: none;
}

.submenu-chevron {
  margin-left: auto;
  transition: transform 0.2s ease;
  color: rgba(60, 60, 67, 0.4);
}

.submenu-chevron.expanded {
  transform: rotate(180deg);
}

.sidebar-submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
  margin-left: 8px;
  border-left: 1.5px solid rgba(60, 60, 67, 0.08);
}

.sidebar-submenu-btn {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  white-space: nowrap;
}

.sidebar-submenu-btn:hover {
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.92);
}

.sidebar-submenu-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.sub-dot.income {
  background: rgb(52, 199, 89);
}

.sub-dot.expense {
  background: rgb(255, 59, 48);
}
</style>
