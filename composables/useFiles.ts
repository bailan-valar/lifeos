/**
 * 文件管理 Composable
 * 提供文件和文件夹的常用操作
 */

import { ref, computed } from 'vue'
import { useFileService } from '~/services/fileService'
import { useFilesStore } from '~/stores/files'
import type { File, Folder, FileUploadTask, FileSearchCriteria, FileStatistics } from '~/types/file'
import { formatFileSize } from '~/types/file'

export function useFiles() {
  const filesStore = useFilesStore()
  const fileService = useFileService()

  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const files = ref<File[]>([])
  const folders = ref<Folder[]>([])
  const currentFolder = ref<Folder | null>(null)

  // 计算属性
  const allItems = computed(() => [
    ...folders.value.map(folder => ({ ...folder, itemType: 'folder' as const })),
    ...files.value.map(file => ({ ...file, itemType: 'file' as const })),
  ])

  const sortedFiles = computed(() => {
    return [...files.value].sort((a, b) => {
      // 按名称排序
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  })

  const sortedFolders = computed(() => {
    return [...folders.value].sort((a, b) => {
      // 先按顺序，再按名称
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return a.name.localeCompare(b.name, 'zh-CN')
    })
  })

  // 文件夹操作
  async function createFolder(folderData: {
    noteId: string
    name: string
    parentId: string
    description?: string
    icon?: string
    color?: string
  }) {
    try {
      loading.value = true
      error.value = null

      const folder = await fileService.createFolder(folderData)

      // 刷新当前文件夹列表
      await refreshCurrentFolder()

      return folder
    } catch (e) {
      error.value = '创建文件夹失败'
      console.error('创建文件夹失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateFolder(folderId: string, updates: Partial<Folder>) {
    try {
      loading.value = true
      error.value = null

      const updated = await fileService.updateFolder(folderId, updates)
      if (updated) {
        // 更新本地状态
        const index = folders.value.findIndex(f => f.id === folderId)
        if (index > -1) {
          folders.value[index] = updated
        }
      }

      return updated
    } catch (e) {
      error.value = '更新文件夹失败'
      console.error('更新文件夹失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteFolder(folderId: string) {
    try {
      loading.value = true
      error.value = null

      const success = await fileService.deleteFolder(folderId)
      if (success) {
        // 从本地状态中移除
        folders.value = folders.value.filter(f => f.id !== folderId)
      }

      return success
    } catch (e) {
      error.value = '删除文件夹失败'
      console.error('删除文件夹失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function openFolder(folder: Folder) {
    try {
      loading.value = true
      error.value = null

      const childFolders = await fileService.getChildFolders(folder.id)
      const folderFiles = await fileService.getFilesInFolder(folder.id)

      folders.value = childFolders
      files.value = folderFiles
      currentFolder.value = folder
    } catch (e) {
      error.value = '打开文件夹失败'
      console.error('打开文件夹失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function navigateUp() {
    if (!currentFolder.value) return

    try {
      loading.value = true
      error.value = null

      if (currentFolder.value.parentId === 'root') {
        await loadRootFolder()
      } else {
        const parentFolder = await fileService.getFolder(currentFolder.value.parentId)
        if (parentFolder) {
          await openFolder(parentFolder)
        }
      }
    } catch (e) {
      error.value = '导航失败'
      console.error('导航失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function loadRootFolder() {
    try {
      loading.value = true
      error.value = null

      const childFolders = await fileService.getChildFolders('root')
      const folderFiles = await fileService.getFilesInFolder('root')

      folders.value = childFolders
      files.value = folderFiles
      currentFolder.value = null
    } catch (e) {
      error.value = '加载根目录失败'
      console.error('加载根目录失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 文件操作
  async function uploadFile(file: File, folderId: string, noteId: string) {
    try {
      loading.value = true
      error.value = null

      // 创建上传任务
      const uploadTask: FileUploadTask = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'uploading',
        folderId,
        noteId,
        createdAt: new Date().toISOString(),
      }

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        if (uploadTask.progress < 90) {
          uploadTask.progress += 10
        }
      }, 200)

      // 这里应该实现实际的上传逻辑
      // 暂时模拟上传成功
      setTimeout(async () => {
        clearInterval(progressInterval)
        uploadTask.progress = 100
        uploadTask.status = 'completed'

        // 创建文件记录
        const fileRecord = await fileService.createFile({
          noteId,
          name: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path: `/uploads/${file.name}`,
          folderId,
        })

        // 刷新当前文件夹
        await refreshCurrentFolder()
      }, 2000)

      return uploadTask
    } catch (e) {
      error.value = '上传文件失败'
      console.error('上传文件失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateFile(fileId: string, updates: Partial<File>) {
    try {
      loading.value = true
      error.value = null

      const updated = await fileService.updateFile(fileId, updates)
      if (updated) {
        // 更新本地状态
        const index = files.value.findIndex(f => f.id === fileId)
        if (index > -1) {
          files.value[index] = updated
        }
      }

      return updated
    } catch (e) {
      error.value = '更新文件失败'
      console.error('更新文件失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteFile(fileId: string) {
    try {
      loading.value = true
      error.value = null

      const success = await fileService.deleteFile(fileId)
      if (success) {
        // 从本地状态中移除
        files.value = files.value.filter(f => f.id !== fileId)
      }

      return success
    } catch (e) {
      error.value = '删除文件失败'
      console.error('删除文件失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 搜索操作
  async function searchFiles(criteria: FileSearchCriteria) {
    try {
      loading.value = true
      error.value = null

      const results = await fileService.searchFiles(criteria)
      return results
    } catch (e) {
      error.value = '搜索失败'
      console.error('搜索失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 统计操作
  async function getStatistics(): Promise<FileStatistics | null> {
    try {
      loading.value = true
      error.value = null

      return await fileService.getFileStatistics()
    } catch (e) {
      error.value = '获取统计信息失败'
      console.error('获取统计信息失败:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // 批量操作
  async function moveItems(itemIds: string[], targetFolderId: string) {
    try {
      loading.value = true
      error.value = null

      let successCount = 0
      for (const id of itemIds) {
        // 判断是文件还是文件夹
        const file = files.value.find(f => f.id === id)
        if (file) {
          const success = await fileService.moveFile(id, targetFolderId)
          if (success) successCount++
        }

        const folder = folders.value.find(f => f.id === id)
        if (folder) {
          const success = await fileService.moveFolder(id, targetFolderId)
          if (success) successCount++
        }
      }

      // 刷新当前文件夹
      await refreshCurrentFolder()

      return successCount
    } catch (e) {
      error.value = '移动项目失败'
      console.error('移动项目失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function batchDeleteItems(itemIds: string[]) {
    try {
      loading.value = true
      error.value = null

      let successCount = 0
      for (const id of itemIds) {
        // 判断是文件还是文件夹
        const file = files.value.find(f => f.id === id)
        if (file) {
          const success = await fileService.deleteFile(id)
          if (success) successCount++
        }

        const folder = folders.value.find(f => f.id === id)
        if (folder) {
          const success = await fileService.deleteFolder(id)
          if (success) successCount++
        }
      }

      // 刷新当前文件夹
      await refreshCurrentFolder()

      return successCount
    } catch (e) {
      error.value = '批量删除失败'
      console.error('批量删除失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 工具方法
  async function refreshCurrentFolder() {
    if (currentFolder.value) {
      await openFolder(currentFolder.value)
    } else {
      await loadRootFolder()
    }
  }

  function getBreadcrumbs() {
    const crumbs: Array<{ id: string; name: string }> = []
    let current = currentFolder.value

    while (current) {
      crumbs.unshift({ id: current.id, name: current.name })
      if (current.parentId === 'root') break

      // 这里需要获取父文件夹，暂时简化处理
      current = null
    }

    return crumbs
  }

  function getIconForFile(file: File): string {
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

  function getFileSizeFormatted(size: number): string {
    return formatFileSize(size)
  }

  return {
    // 状态
    loading,
    error,
    files,
    folders,
    currentFolder,
    allItems,
    sortedFiles,
    sortedFolders,

    // 文件夹操作
    createFolder,
    updateFolder,
    deleteFolder,
    openFolder,
    navigateUp,
    loadRootFolder,

    // 文件操作
    uploadFile,
    updateFile,
    deleteFile,

    // 搜索和统计
    searchFiles,
    getStatistics,

    // 批量操作
    moveItems,
    batchDeleteItems,

    // 工具方法
    refreshCurrentFolder,
    getBreadcrumbs,
    getIconForFile,
    getFileSizeFormatted,
  }
}
