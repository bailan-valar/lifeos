<template>
  <div class="mobile-tabbar">
    <button
      v-for="tab in store.mobileTabs"
      :key="tab.id"
      type="button"
      class="tabbar-btn"
      :class="{ active: store.activeTab === tab.id }"
      @click="store.setActiveTab(tab.id)"
    >
      <Icon :name="tab.icon" size="20" />
      <span class="tabbar-label">{{ tab.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useGoalsStore } from '~/stores/goals'

const store = useGoalsStore()
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