<template>
  <div class="files-sidebar" :class="{ collapsed: collapsed }">
    <!-- 顶部区域 -->
    <div class="sidebar-header">
      <button class="collapse-btn" type="button" @click="toggleCollapse">
        <Icon :name="collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-left-linear'" size="16" />
      </button>
      <div v-if="!collapsed" class="header-title">
        <span>文件管理</span>
      </div>
    </div>

    <!-- 导航菜单 -->
    <div class="sidebar-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="nav-item"
        :class="{ active: activeTab === tab.id }"
        @click="store.setActiveTab(tab.id)"
      >
        <Icon :name="tab.icon" size="20" />
        <span v-if="!collapsed" class="nav-label">{{ tab.name }}</span>
      </button>
    </div>

    <!-- 快速访问 -->
    <div v-if="!collapsed" class="sidebar-section">
      <div class="section-title">快速访问</div>
      <div class="quick-access">
        <button type="button" class="quick-access-item" @click="openRootFolder">
          <Icon name="solar:home-angle-2-linear" size="18" />
          <span>根目录</span>
        </button>
        <button type="button" class="quick-access-item" @click="openRecentFiles">
          <Icon name="solar:clock-circle-linear" size="18" />
          <span>最近文件</span>
        </button>
        <button type="button" class="quick-access-item" @click="openStarredFiles">
          <Icon name="solar:star-linear" size="18" />
          <span>星标文件</span>
        </button>
      </div>
    </div>

    <!-- 存储信息 -->
    <div v-if="!collapsed" class="sidebar-footer">
      <div class="storage-info">
        <div class="storage-label">存储空间</div>
        <div class="storage-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: storagePercentage + '%' }" />
          </div>
          <div class="storage-text">{{ storageUsedText }} / {{ storageLimitText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useFilesStore } from '~/stores/files'
import { storeToRefs } from 'pinia'

const store = useFilesStore()
const { activeTab, sidebarCollapsed, tabs } = storeToRefs(store)

const collapsed = computed(() => sidebarCollapsed.value)
const storageUsed = ref(0)
const storageLimit = ref(10 * 1024 * 1024 * 1024) // 10GB

const storagePercentage = computed(() => {
  if (storageLimit.value === 0) return 0
  return Math.min((storageUsed.value / storageLimit.value) * 100, 100)
})

const storageUsedText = computed(() => {
  return formatFileSize(storageUsed.value)
})

const storageLimitText = computed(() => {
  return formatFileSize(storageLimit.value)
})

function toggleCollapse() {
  store.toggleSidebar()
}

function openRootFolder() {
  store.setActiveTab('files')
  // 触发加载根目录事件
  navigateToFolder('root')
}

function openRecentFiles() {
  store.setActiveTab('search')
  // 触发显示最近文件
}

function openStarredFiles() {
  store.setActiveTab('search')
  // 触发显示星标文件
}

function navigateToFolder(folderId: string) {
  // 这里需要通过事件或者路由来触发文件夹切换
  console.log('导航到文件夹:', folderId)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

onMounted(() => {
  // 加载存储使用情况
  loadStorageInfo()
})

async function loadStorageInfo() {
  // 这里应该从服务获取实际存储使用情况
  storageUsed.value = 1024 * 1024 * 100 // 100MB 示例
}
</script>

<style scoped>
.files-sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  background: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-right: 0.5px solid rgba(0, 0, 0, 0.1);
  transition: width 0.2s ease;
}

.files-sidebar.collapsed {
  width: 48px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.collapse-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.8);
}

.header-title {
  margin-left: 8px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.85);
}

.nav-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-weight: 500;
}

.nav-label {
  margin-left: 12px;
  font-size: 13px;
}

.sidebar-section {
  padding: 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.quick-access {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-access-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-size: 13px;
}

.quick-access-item:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.85);
}

.quick-access-item span {
  margin-left: 12px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.storage-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
}

.storage-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(0, 122, 255), rgb(88, 86, 214));
  transition: width 0.3s ease;
}

.storage-text {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
