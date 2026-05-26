import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type FilesTabId = 'files' | 'upload' | 'search' | 'stats'
export type FileViewMode = 'grid' | 'list' | 'tree'

export const useFilesStore = defineStore('files', () => {
  // ========== 导航状态 ==========
  const getStoredActiveTab = (): FilesTabId => {
    if (import.meta.client) {
      const stored = localStorage.getItem('lifeos:files-active-tab')
      if (stored && ['files', 'upload', 'search', 'stats'].includes(stored)) {
        return stored as FilesTabId
      }
    }
    return 'files'
  }

  const getStoredViewMode = (): FileViewMode => {
    if (import.meta.client) {
      const stored = localStorage.getItem('lifeos:files-view-mode')
      if (stored && ['grid', 'list', 'tree'].includes(stored)) {
        return stored as FileViewMode
      }
    }
    return 'grid'
  }

  const activeTab = ref<FilesTabId>(getStoredActiveTab())
  const viewMode = ref<FileViewMode>(getStoredViewMode())
  const sidebarCollapsed = ref(false)

  // 常量数据
  const tabs = [
    { id: 'files' as FilesTabId, name: '文件', icon: 'solar:folder-linear' },
    { id: 'upload' as FilesTabId, name: '上传', icon: 'solar:upload-linear' },
    { id: 'search' as FilesTabId, name: '搜索', icon: 'solar:magnifer-linear' },
    { id: 'stats' as FilesTabId, name: '统计', icon: 'solar:chart-linear' }
  ]

  const mobileTabs = [
    { id: 'files' as FilesTabId, name: '文件', icon: 'solar:folder-linear' },
    { id: 'upload' as FilesTabId, name: '上传', icon: 'solar:upload-linear' },
    { id: 'search' as FilesTabId, name: '搜索', icon: 'solar:magnifer-linear' },
    { id: 'stats' as FilesTabId, name: '统计', icon: 'solar:chart-linear' }
  ]

  // ========== 批量操作状态 ==========
  const batchMode = ref(false)
  const selectedIds = ref<string[]>([])

  // ========== 计算属性 ==========
  const hasSelection = computed(() => selectedIds.value.length > 0)
  const selectedCount = computed(() => selectedIds.value.length)
  const isAllSelected = computed(() => {
    // 这个需要在具体使用时根据总数量来判断
    return false
  })

  // ========== 操作方法 ==========
  function setActiveTab(tabId: FilesTabId) {
    activeTab.value = tabId
    if (import.meta.client) {
      localStorage.setItem('lifeos:files-active-tab', tabId)
    }
  }

  function setViewMode(mode: FileViewMode) {
    viewMode.value = mode
    if (import.meta.client) {
      localStorage.setItem('lifeos:files-view-mode', mode)
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function enterBatchMode() {
    batchMode.value = true
    selectedIds.value = []
  }

  function exitBatchMode() {
    batchMode.value = false
    selectedIds.value = []
  }

  function toggleSelection(id: string) {
    const index = selectedIds.value.indexOf(id)
    if (index > -1) {
      selectedIds.value.splice(index, 1)
    } else {
      selectedIds.value.push(id)
    }

    // 如果没有选中项，自动退出批量模式
    if (selectedIds.value.length === 0 && batchMode.value) {
      exitBatchMode()
    }
  }

  function selectAll(ids: string[]) {
    selectedIds.value = [...ids]
    if (!batchMode.value) {
      batchMode.value = true
    }
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function unselectAll() {
    selectedIds.value = []
    if (batchMode.value) {
      exitBatchMode()
    }
  }

  // ========== 重置方法 ==========
  function $reset() {
    activeTab.value = 'files'
    viewMode.value = 'grid'
    sidebarCollapsed.value = false
    batchMode.value = false
    selectedIds.value = []
  }

  return {
    // 状态
    activeTab,
    viewMode,
    sidebarCollapsed,
    batchMode,
    selectedIds,

    // 计算属性
    hasSelection,
    selectedCount,
    isAllSelected,

    // 常量
    tabs,
    mobileTabs,

    // 方法
    setActiveTab,
    setViewMode,
    toggleSidebar,
    enterBatchMode,
    exitBatchMode,
    toggleSelection,
    selectAll,
    clearSelection,
    unselectAll,
    $reset,
  }
})
