<template>
  <div class="files-view" :class="{ mobile: isMobile }">
    <!-- 侧边栏（桌面端） -->
    <FilesSidebar v-if="!isMobile" />

    <!-- 内容区域 -->
    <div class="content" :class="{ mobile: isMobile }">
      <!-- 文件列表Tab -->
      <div v-show="activeTab === 'files'" class="tab-panel-wrapper">
        <FilesTabPanel
          :files="files"
          :folders="folders"
          :current-folder="currentFolder"
          :batch-mode="batchMode"
          :selected-ids="selectedIds"
          :loading="loading"
          :view-mode="viewMode"
          @toggle-select-all="handleToggleSelectAll"
          @exit-batch-mode="exitBatchMode"
          @select-item="toggleItemSelect"
          @open-folder="openFolder"
          @navigate-up="navigateUp"
        />
      </div>

      <!-- 上传Tab -->
      <div v-show="activeTab === 'upload'" class="tab-panel-wrapper">
        <UploadTabPanel
          :upload-tasks="uploadTasks"
          @upload-start="handleUploadStart"
          @upload-cancel="handleUploadCancel"
        />
      </div>

      <!-- 搜索Tab -->
      <div v-show="activeTab === 'search'" class="tab-panel-wrapper">
        <SearchTabPanel
          :search-results="searchResults"
          :searching="searching"
          @search="handleSearch"
          @open-file="openFile"
        />
      </div>

      <!-- 统计Tab -->
      <div v-show="activeTab === 'stats'" class="tab-panel-wrapper">
        <StatsTabPanel :statistics="statistics" />
      </div>
    </div>

    <!-- 移动端Tab栏 -->
    <FilesMobileTabbar v-if="isMobile" />
  </div>
</template>

<script setup lang="ts">
import type { File, Folder, FileUploadTask, FileStatistics, FileSearchCriteria } from '~/types/file'
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useModuleBase } from '~/composables/useModuleBase'
import { useFileService } from '~/services/fileService'
import { useConfirm } from '~/composables/useConfirm'
import { usePageHeaderStore } from '~/stores/pageHeader'
import { storeToRefs } from 'pinia'
import { useFilesStore } from '~/stores/files'

// 布局组件
import FilesSidebar from './components/layout/FilesSidebar.vue'
import FilesMobileTabbar from './components/layout/FilesMobileTabbar.vue'

// 面板组件
import FilesTabPanel from './components/panels/FilesTabPanel.vue'
import UploadTabPanel from './components/panels/UploadTabPanel.vue'
import SearchTabPanel from './components/panels/SearchTabPanel.vue'
import StatsTabPanel from './components/panels/StatsTabPanel.vue'

const props = defineProps<{ noteId: string; moduleData?: unknown; onDataChange?: (data: unknown) => void }>()
const emit = defineEmits<{ (e: 'ready'): void; (e: 'error', error: Error): void; (e: 'data-change', data: unknown): void }>()

const { markReady, handleError } = useModuleBase(props, emit)
const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const { isMobile } = useDevice()

// Store
const filesStore = useFilesStore()
const { activeTab, viewMode, batchMode, selectedIds } = storeToRefs(filesStore)

// Service
const fileService = useFileService()

// 状态
const loading = ref(false)
const files = ref<File[]>([])
const folders = ref<Folder[]>([])
const currentFolder = ref<Folder | null>(null)
const uploadTasks = ref<FileUploadTask[]>([])
const searchResults = ref<File[]>([])
const searching = ref(false)
const statistics = ref<FileStatistics | null>(null)

// 初始化
onMounted(async () => {
  try {
    loading.value = true

    // 设置工作空间
    const workspaceStore = useWorkspaceStore()
    fileService.setWorkspace(workspaceStore.currentId)

    // 加载根目录
    await loadRootFolder()

    // 加载统计信息
    await loadStatistics()

    markReady()
  } catch (error) {
    handleError(error as Error)
  } finally {
    loading.value = false
  }
})

// 加载根目录
async function loadRootFolder() {
  try {
    loading.value = true
    const childFolders = await fileService.getChildFolders('root')
    const folderFiles = await fileService.getFilesInFolder('root')

    folders.value = childFolders
    files.value = folderFiles
    currentFolder.value = null
  } catch (error) {
    showError('加载文件夹失败')
    console.error('加载根目录失败:', error)
  } finally {
    loading.value = false
  }
}

// 打开文件夹
async function openFolder(folder: Folder) {
  try {
    loading.value = true
    const childFolders = await fileService.getChildFolders(folder.id)
    const folderFiles = await fileService.getFilesInFolder(folder.id)

    folders.value = childFolders
    files.value = folderFiles
    currentFolder.value = folder
  } catch (error) {
    showError('打开文件夹失败')
    console.error('打开文件夹失败:', error)
  } finally {
    loading.value = false
  }
}

// 向上一级
async function navigateUp() {
  if (!currentFolder.value) return

  if (currentFolder.value.parentId === 'root') {
    await loadRootFolder()
  } else {
    const parentFolder = await fileService.getFolder(currentFolder.value.parentId)
    if (parentFolder) {
      await openFolder(parentFolder)
    }
  }
}

// 批量操作
function handleToggleSelectAll() {
  if (selectedIds.value.length === files.value.length + folders.value.length) {
    filesStore.clearSelection()
  } else {
    filesStore.selectAll([...files.value.map(f => f.id), ...folders.value.map(f => f.id)])
  }
}

function toggleItemSelect(id: string) {
  filesStore.toggleSelection(id)
}

function exitBatchMode() {
  filesStore.exitBatchMode()
}

// 上传处理
function handleUploadStart(task: FileUploadTask) {
  uploadTasks.value.push(task)
}

async function handleUploadCancel(taskId: string) {
  const index = uploadTasks.value.findIndex(t => t.id === taskId)
  if (index > -1) {
    uploadTasks.value.splice(index, 1)
  }
}

// 搜索处理
async function handleSearch(criteria: FileSearchCriteria) {
  try {
    searching.value = true
    searchResults.value = await fileService.searchFiles(criteria)
  } catch (error) {
    showError('搜索失败')
    console.error('搜索失败:', error)
  } finally {
    searching.value = false
  }
}

// 打开文件
function openFile(file: File) {
  // 实现文件打开逻辑
  console.log('打开文件:', file)
}

// 加载统计信息
async function loadStatistics() {
  try {
    statistics.value = await fileService.getFileStatistics()
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

// 监听标签页变化
watch(activeTab, async (newTab) => {
  if (newTab === 'stats') {
    await loadStatistics()
  }
})

// 清理
onBeforeUnmount(() => {
  // 清理上传任务
  uploadTasks.value = []
})
</script>

<style scoped>
.files-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.files-view.mobile {
  flex-direction: column;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content.mobile {
  overflow-y: auto;
}

.tab-panel-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
