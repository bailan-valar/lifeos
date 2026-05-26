<template>
  <div class="files-mobile-tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="tab-item"
      :class="{ active: activeTab === tab.id }"
      @click="store.setActiveTab(tab.id)"
    >
      <Icon :name="tab.icon" size="22" />
      <span class="tab-label">{{ tab.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useFilesStore } from '~/stores/files'
import { storeToRefs } from 'pinia'

const store = useFilesStore()
const { activeTab, mobileTabs: tabs } = storeToRefs(store)
</script>

<style scoped>
.files-mobile-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  padding: 0 8px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.tab-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tab-item.active {
  color: rgb(0, 122, 255);
}

.tab-item.active .tab-label {
  font-weight: 600;
}

.tab-label {
  font-size: 11px;
  margin-top: 4px;
  letter-spacing: -0.01em;
}
</style>
