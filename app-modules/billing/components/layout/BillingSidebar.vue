<template>
  <div class="sidebar" :class="{ collapsed: navigation.sidebarCollapsed.value }">
    <button
      type="button"
      class="sidebar-toggle"
      :title="navigation.sidebarCollapsed.value ? '展开' : '收起'"
      @click="navigation.toggleSidebar()"
    >
      <Icon
        :name="navigation.sidebarCollapsed.value ? 'solar:double-alt-arrow-right-linear' : 'solar:double-alt-arrow-left-linear'"
        size="16"
      />
    </button>

    <template v-for="tab in navigation.tabs" :key="tab.id">
      <!-- 账户Tab -->
      <template v-if="tab.id === 'accounts'">
        <button
          type="button"
          class="sidebar-btn"
          :class="{ active: navigation.activeTab.value === 'accounts' }"
          :title="navigation.sidebarCollapsed.value ? tab.name : ''"
          @click="navigation.onAccountsTabClick()"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!navigation.sidebarCollapsed.value"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: navigation.accountsMenuExpanded.value }"
          />
        </button>
        <div
          v-if="!navigation.sidebarCollapsed.value && navigation.accountsMenuExpanded.value"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in navigation.accountSubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: navigation.activeTab.value === 'accounts' && navigation.activeAccountSubTab.value === sub.type }"
            @click="navigation.activeAccountSubTab.value = sub.type"
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
          :class="{ active: navigation.activeTab.value === 'categories' }"
          :title="navigation.sidebarCollapsed.value ? tab.name : ''"
          @click="navigation.onCategoriesTabClick()"
        >
          <Icon :name="tab.icon" size="18" />
          <span class="sidebar-btn-text">{{ tab.name }}</span>
          <Icon
            v-if="!navigation.sidebarCollapsed.value"
            name="solar:alt-arrow-down-linear"
            size="14"
            class="submenu-chevron"
            :class="{ expanded: navigation.categoryMenuExpanded.value }"
          />
        </button>
        <div
          v-if="!navigation.sidebarCollapsed.value && navigation.categoryMenuExpanded.value"
          class="sidebar-submenu"
        >
          <button
            v-for="sub in navigation.categorySubTabs"
            :key="sub.type"
            type="button"
            class="sidebar-submenu-btn"
            :class="{ active: navigation.activeTab.value === 'categories' && navigation.activeCategorySubTab.value === sub.type }"
            @click="navigation.activeCategorySubTab.value = sub.type"
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
        :class="{ active: navigation.activeTab.value === tab.id }"
        :title="navigation.sidebarCollapsed.value ? tab.name : ''"
        @click="navigation.activeTab.value = tab.id"
      >
        <Icon :name="tab.icon" size="18" />
        <span class="sidebar-btn-text">{{ tab.name }}</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

const navigation = inject<any>('billingNavigation')
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
