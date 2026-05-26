<template>
  <div class="files-tab-panel">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 面包屑导航 -->
        <div class="breadcrumbs">
          <button
            v-for="(crumb, index) in breadcrumbs"
            :key="crumb.id"
            type="button"
            class="crumb-item"
            :class="{ clickable: index < breadcrumbs.length - 1 }"
            @click="handleBreadcrumbClick(crumb, index)"
          >
            <span>{{ crumb.name }}</span>
            <Icon
              v-if="index < breadcrumbs.length - 1"
              name="solar:alt-arrow-right-linear"
              size="14"
            />
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- 视图切换 -->
        <div class="view-switcher">
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="changeViewMode('grid')"
          >
            <Icon name="solar:grid-view-linear" size="18" />
          </button>
          <button
            type="button"
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
            @click="changeViewMode('list')"
          >
            <Icon name="solar:list-view-linear" size="18" />
          </button>
        </div>

        <!-- 新建按钮 -->
        <button type="button" class="action-btn primary" @click="showNewMenu">
          <Icon name="solar:add-circle-linear" size="18" />
          <span>新建</span>
        </button>

        <!-- 更多操作 -->
        <button
          v-if="!batchMode"
          type="button"
          class="action-btn"
          @click="enterBatchMode"
        >
          <Icon name="solar:select-all-linear" size="18" />
        </button>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="batchMode" class="batch-toolbar">
      <div class="batch-info">
        <span>已选择 {{ selectedIds.length }} 项</span>
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-btn" @click="handleBatchMove">
          <Icon name="solar:folder-move-linear" size="16" />
          <span>移动</span>
        </button>
        <button type="button" class="batch-btn danger" @click="handleBatchDelete">
          <Icon name="solar:trash-bin-trash-linear" size="16" />
          <span>删除</span>
        </button>
        <button type="button" class="batch-btn cancel" @click="exitBatchMode">
          <Icon name="solar:close-circle-linear" size="16" />
          <span>取消</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area" :class="[`view-${viewMode}`, { 'batch-mode': batchMode }]">
      <!-- 空状态 -->
      <div v-if="isEmpty" class="empty-state">
        <Icon name="solar:folder-open-linear" size="64" />
        <div class="empty-title">文件夹为空</div>
        <div class="empty-desc">
          上传文件或创建新文件夹来开始使用
        </div>
        <button type="button" class="empty-btn" @click="showNewMenu">
          <Icon name="solar:add-circle-linear" size="18" />
          <span>新建文件</span>
        </button>
      </div>

      <!-- 网格视图 -->
      <div v-else-if="viewMode === 'grid'" class="grid-view">
        <div
          v-for="item in allItems"
          :key="item.id"
          class="grid-item"
          :class="{
            'selected': selectedIds.includes(item.id),
            'folder': item.itemType === 'folder'
          }"
          @click="handleItemClick(item)"
          @dblclick="handleItemDoubleClick(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
        >
          <div class="item-checkbox" v-if="batchMode">
            <input
              type="checkbox"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id)"
              @click.stop
            />
          </div>

          <div class="item-icon">
            <Icon
              :name="item.itemType === 'folder' ? 'solar:folder-linear' : getFileIcon(item)"
              :size="48"
            />
          </div>

          <div class="item-info">
            <div class="item-name" :title="item.name">
              {{ item.name }}
            </div>
            <div class="item-meta">
              <template v-if="item.itemType === 'folder'">
                {{ item.itemCount }} 文件
              </template>
              <template v-else>
                {{ formatFileSize(item.size) }}
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else-if="viewMode === 'list'" class="list-view">
        <div class="list-header">
          <div class="header-name">名称</div>
          <div class="header-size">大小</div>
          <div class="header-date">修改时间</div>
        </div>

        <div
          v-for="item in allItems"
          :key="item.id"
          class="list-item"
          :class="{
            'selected': selectedIds.includes(item.id),
            'folder': item.itemType === 'folder'
          }"
          @click="handleItemClick(item)"
          @dblclick="handleItemDoubleClick(item)"
          @contextmenu.prevent="handleContextMenu($event, item)"
        >
          <div class="item-checkbox" v-if="batchMode">
            <input
              type="checkbox"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id)"
              @click.stop
            />
          </div>

          <div class="item-name">
            <Icon
              :name="item.itemType === 'folder' ? 'solar:folder-linear' : getFileIcon(item)"
              :size="20"
            />
            <span>{{ item.name }}</span>
          </div>

          <div class="item-size">
            <template v-if="item.itemType === 'folder'">
              {{ item.itemCount }} 项
            </template>
            <template v-else>
              {{ formatFileSize(item.size) }}
            </template>
          </div>

          <div class="item-date">
            {{ formatDate(item.updatedAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { File, Folder } from '~/types/file'
import { computed, ref } from 'vue'

const props = defineProps<{
  files: File[]
  folders: Folder[]
  currentFolder: Folder | null
  batchMode: boolean
  selectedIds: string[]
  loading: boolean
  viewMode: 'grid' | 'list' | 'tree'
}>()

const emit = defineEmits<{
  (e: 'toggle-select-all'): void
  (e: 'exit-batch-mode'): void
  (e: 'select-item', id: string): void
  (e: 'open-folder', folder: Folder): void
  (e: 'navigate-up'): void
}>()

// 计算属性
const allItems = computed(() => {
  const folders = props.folders.map(f => ({ ...f, itemType: 'folder' as const }))
  const files = props.files.map(f => ({ ...f, itemType: 'file' as const }))
  return [...folders, ...files]
})

const isEmpty = computed(() => {
  return props.files.length === 0 && props.folders.length === 0
})

const breadcrumbs = computed(() => {
  const crumbs: Array<{ id: string; name: string }> = []

  if (props.currentFolder) {
    crumbs.push({ id: 'root', name: '根目录' })

    // 这里应该根据文件夹层级生成面包屑
    // 简化版本只显示当前文件夹
    crumbs.push({ id: props.currentFolder.id, name: props.currentFolder.name })
  } else {
    crumbs.push({ id: 'root', name: '根目录' })
  }

  return crumbs
})

// 方法
function changeViewMode(mode: 'grid' | 'list') {
  // 切换视图模式
  console.log('切换视图模式:', mode)
}

function showNewMenu() {
  // 显示新建菜单
  console.log('显示新建菜单')
}

function enterBatchMode() {
  // 进入批量模式
  console.log('进入批量模式')
}

function handleBreadcrumbClick(crumb: { id: string; name: string }, index: number) {
  if (index < breadcrumbs.value.length - 1) {
    // 导航到对应的文件夹
    console.log('导航到:', crumb.id)
  }
}

function handleItemClick(item: any) {
  if (props.batchMode) {
    emit('select-item', item.id)
  } else {
    // 单击操作
    console.log('单击项目:', item)
  }
}

function handleItemDoubleClick(item: any) {
  if (item.itemType === 'folder') {
    emit('open-folder', item)
  } else {
    // 打开文件
    console.log('打开文件:', item)
  }
}

function handleContextMenu(event: MouseEvent, item: any) {
  // 显示右键菜单
  console.log('显示右键菜单:', item)
}

function toggleSelect(id: string) {
  emit('select-item', id)
}

function handleBatchMove() {
  // 批量移动
  console.log('批量移动')
}

function handleBatchDelete() {
  // 批量删除
  console.log('批量删除')
}

function exitBatchMode() {
  emit('exit-batch-mode')
}

function getFileIcon(file: any): string {
  const iconMap: Record<string, string> = {
    'image': 'solar:gallery-linear',
    'video': 'solar:videocamera-linear',
    'audio': 'solar:music-linear',
    'document': 'solar:document-linear',
    'archive': 'solar:zip-file-linear',
    'other': 'solar:file-linear',
  }
  return iconMap[file.type] || iconMap['other']
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
}
</script>

<style scoped>
.files-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.breadcrumbs::-webkit-scrollbar {
  display: none;
}

.crumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.6);
  cursor: default;
  font-size: 13px;
  white-space: nowrap;
}

.crumb-item.clickable {
  cursor: pointer;
  color: rgba(0, 0, 0, 0.8);
}

.crumb-item.clickable:hover {
  color: rgb(0, 122, 255);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-switcher {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 2px;
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.view-btn.active {
  background: white;
  color: rgb(0, 122, 255);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.action-btn.primary {
  background: rgb(0, 122, 255);
  color: white;
  border-color: rgb(0, 122, 255);
}

.action-btn.primary:hover {
  background: rgb(0, 98, 218);
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 122, 255, 0.1);
  border-bottom: 1px solid rgba(0, 122, 255, 0.2);
}

.batch-info {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.8);
  font-weight: 500;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.batch-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.batch-btn.danger {
  color: rgb(255, 59, 48);
  border-color: rgba(255, 59, 48, 0.3);
}

.batch-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(0, 0, 0, 0.4);
  padding: 40px;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  margin-bottom: 24px;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.empty-btn:hover {
  background: rgb(0, 98, 218);
}

.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.grid-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-item:hover {
  border-color: rgba(0, 122, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.grid-item.selected {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
}

.item-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
}

.item-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.item-icon {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.folder .item-icon {
  color: rgb(0, 122, 255);
}

.item-info {
  text-align: center;
  width: 100%;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
}

.list-view {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 100px 120px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.list-item {
  display: grid;
  grid-template-columns: 1fr 100px 120px;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.list-item:hover {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 122, 255, 0.2);
}

.list-item.selected {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgb(0, 122, 255);
}

.item-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-size, .item-date {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
