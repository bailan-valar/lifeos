/**
 * 文件管理服务
 * 提供文件和文件夹的数据库操作、上传、下载等功能
 */

import { getFileType, formatFileSize, getFileExtension } from '~/types/file'
import type { File, Folder, FileUploadTask, FileSearchCriteria, FileSortCriteria, FileStatistics, FileActivity } from '~/types/file'

class FileService {
  private workspaceId: string = ''

  setWorkspace(workspaceId: string) {
    this.workspaceId = workspaceId
  }

  get db() {
    if (!this.workspaceId) {
      throw new Error('Workspace not set')
    }
    return import('~/services/db').then(({ db }) => db(this.workspaceId))
  }

  /**
   * 创建文件夹
   */
  async createFolder(folderData: {
    noteId: string
    name: string
    parentId: string
    description?: string
    icon?: string
    color?: string
    order?: number
  }): Promise<Folder> {
    const db = await this.db
    const id = `folders/${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const folder: Folder = {
      id,
      noteId: folderData.noteId,
      name: folderData.name,
      parentId: folderData.parentId,
      path: '', // 将在创建后更新
      icon: folderData.icon,
      color: folderData.color,
      description: folderData.description,
      permissions: ['read', 'write', 'delete'],
      order: folderData.order || 0,
      itemCount: 0,
      folderCount: 0,
      size: 0,
      createdAt: now,
      updatedAt: now,
    }

    // 计算完整路径
    if (folderData.parentId === 'root') {
      folder.path = `/${folder.name}`
    } else {
      const parentFolder = await this.getFolder(folderData.parentId)
      folder.path = parentFolder ? `${parentFolder.path}/${folder.name}` : `/${folder.name}`
    }

    await db.put({
      _id: id,
      ...folder,
      collection: 'folders',
    })

    return folder
  }

  /**
   * 获取文件夹
   */
  async getFolder(folderId: string): Promise<Folder | null> {
    const db = await this.db
    try {
      const doc = await db.get(`folders/${folderId}`)
      return {
        id: doc.id,
        noteId: doc.noteId,
        name: doc.name,
        parentId: doc.parentId,
        path: doc.path,
        icon: doc.icon,
        color: doc.color,
        description: doc.description,
        permissions: doc.permissions,
        order: doc.order,
        itemCount: doc.itemCount,
        folderCount: doc.folderCount,
        size: doc.size,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      } as Folder
    } catch (error) {
      console.error('获取文件夹失败:', error)
      return null
    }
  }

  /**
   * 获取文件夹的子文件夹
   */
  async getChildFolders(parentId: string): Promise<Folder[]> {
    const db = await this.db
    const result = await db.find({
      selector: {
        collection: 'folders',
        parentId: parentId,
      },
      sort: [{ order: 'asc' }],
    })

    return result.docs.map((doc: any) => ({
      id: doc.id,
      noteId: doc.noteId,
      name: doc.name,
      parentId: doc.parentId,
      path: doc.path,
      icon: doc.icon,
      color: doc.color,
      description: doc.description,
      permissions: doc.permissions,
      order: doc.order,
      itemCount: doc.itemCount,
      folderCount: doc.folderCount,
      size: doc.size,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })) as Folder[]
  }

  /**
   * 更新文件夹
   */
  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder | null> {
    const db = await this.db
    try {
      const existing = await db.get(`folders/${folderId}`)
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      await db.put(updated)
      return updated as Folder
    } catch (error) {
      console.error('更新文件夹失败:', error)
      return null
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(folderId: string): Promise<boolean> {
    const db = await this.db
    try {
      // 先删除子文件夹和文件
      const childFolders = await this.getChildFolders(folderId)
      for (const childFolder of childFolders) {
        await this.deleteFolder(childFolder.id)
      }

      const files = await this.getFilesInFolder(folderId)
      for (const file of files) {
        await this.deleteFile(file.id)
      }

      const doc = await db.get(`folders/${folderId}`)
      await db.remove(doc)
      return true
    } catch (error) {
      console.error('删除文件夹失败:', error)
      return false
    }
  }

  /**
   * 创建文件记录
   */
  async createFile(fileData: {
    noteId: string
    name: string
    originalName: string
    mimeType: string
    size: number
    path: string
    folderId: string
    thumbnail?: string
    description?: string
    tags?: string[]
    metadata?: any
  }): Promise<File> {
    const db = await this.db
    const id = `files/${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const file: File = {
      id,
      noteId: fileData.noteId,
      name: fileData.name,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      type: getFileType(fileData.mimeType),
      size: fileData.size,
      path: fileData.path,
      folderId: fileData.folderId,
      thumbnail: fileData.thumbnail,
      permissions: ['read', 'write', 'delete'],
      tags: fileData.tags || [],
      description: fileData.description,
      status: 'completed',
      metadata: fileData.metadata,
      createdAt: now,
      updatedAt: now,
    }

    await db.put({
      _id: id,
      ...file,
      collection: 'files',
    })

    // 更新文件夹统计
    await this.updateFolderStats(fileData.folderId)

    return file
  }

  /**
   * 获取文件
   */
  async getFile(fileId: string): Promise<File | null> {
    const db = await this.db
    try {
      const doc = await db.get(`files/${fileId}`)
      return doc as File
    } catch (error) {
      console.error('获取文件失败:', error)
      return null
    }
  }

  /**
   * 获取文件夹中的文件
   */
  async getFilesInFolder(folderId: string): Promise<File[]> {
    const db = await this.db
    const result = await db.find({
      selector: {
        collection: 'files',
        folderId: folderId,
      },
      sort: [{ name: 'asc' }],
    })

    return result.docs.map((doc: any) => doc as File)
  }

  /**
   * 更新文件
   */
  async updateFile(fileId: string, updates: Partial<File>): Promise<File | null> {
    const db = await this.db
    try {
      const existing = await db.get(`files/${fileId}`)
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      await db.put(updated)
      return updated as File
    } catch (error) {
      console.error('更新文件失败:', error)
      return null
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const db = await this.db
    try {
      const doc = await db.get(`files/${fileId}`)
      const file = doc as File

      // 更新文件夹统计
      await this.updateFolderStats(file.folderId)

      await db.remove(doc)
      return true
    } catch (error) {
      console.error('删除文件失败:', error)
      return false
    }
  }

  /**
   * 搜索文件
   */
  async searchFiles(criteria: FileSearchCriteria): Promise<File[]> {
    const db = await this.db
    const selector: any = {
      collection: 'files',
    }

    if (criteria.keyword) {
      selector.name = { $regex: criteria.keyword, $options: 'i' }
    }

    if (criteria.folderId) {
      selector.folderId = criteria.folderId
    }

    if (criteria.type && criteria.type.length > 0) {
      selector.type = { $in: criteria.type }
    }

    if (criteria.tags && criteria.tags.length > 0) {
      selector.tags = { $in: criteria.tags }
    }

    const result = await db.find({
      selector,
      sort: [{ createdAt: 'desc' }],
    })

    let files = result.docs.map((doc: any) => doc as File)

    // 应用额外的过滤条件
    if (criteria.minSize !== undefined) {
      files = files.filter(file => file.size >= criteria.minSize!)
    }

    if (criteria.maxSize !== undefined) {
      files = files.filter(file => file.size <= criteria.maxSize!)
    }

    if (criteria.startDate) {
      files = files.filter(file => file.createdAt >= criteria.startDate!)
    }

    if (criteria.endDate) {
      files = files.filter(file => file.createdAt <= criteria.endDate!)
    }

    return files
  }

  /**
   * 获取文件统计信息
   */
  async getFileStatistics(): Promise<FileStatistics> {
    const db = await this.db
    const files = await db.find({
      selector: {
        collection: 'files',
      },
    })

    const folders = await db.find({
      selector: {
        collection: 'folders',
      },
    })

    const totalFiles = files.docs.length
    const totalFolders = folders.docs.length
    const totalSize = files.docs.reduce((sum: number, doc: any) => sum + doc.size, 0)

    // 按类型分布统计
    const typeDistribution: Record<string, number> = {}
    for (const doc of files.docs) {
      const type = doc.type
      typeDistribution[type] = (typeDistribution[type] || 0) + 1
    }

    return {
      totalFiles,
      totalFolders,
      totalSize,
      storageUsed: totalSize,
      storageLimit: 1024 * 1024 * 1024 * 10, // 10GB 默认限制
      typeDistribution,
      recentActivity: [],
    }
  }

  /**
   * 更新文件夹统计信息
   */
  private async updateFolderStats(folderId: string): Promise<void> {
    const db = await this.db
    const files = await this.getFilesInFolder(folderId)
    const childFolders = await this.getChildFolders(folderId)

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const itemCount = files.length
    const folderCount = childFolders.length

    await this.updateFolder(folderId, {
      size: totalSize,
      itemCount,
      folderCount,
    })
  }

  /**
   * 移动文件
   */
  async moveFile(fileId: string, targetFolderId: string): Promise<boolean> {
    const file = await this.getFile(fileId)
    if (!file) return false

    const oldFolderId = file.folderId
    const success = await this.updateFile(fileId, { folderId: targetFolderId }) !== null

    if (success) {
      await this.updateFolderStats(oldFolderId)
      await this.updateFolderStats(targetFolderId)
    }

    return success
  }

  /**
   * 移动文件夹
   */
  async moveFolder(folderId: string, targetParentId: string): Promise<boolean> {
    const folder = await this.getFolder(folderId)
    if (!folder) return false

    // 计算新路径
    let newPath = ''
    if (targetParentId === 'root') {
      newPath = `/${folder.name}`
    } else {
      const parentFolder = await this.getFolder(targetParentId)
      newPath = parentFolder ? `${parentFolder.path}/${folder.name}` : `/${folder.name}`
    }

    const success = await this.updateFolder(folderId, {
      parentId: targetParentId,
      path: newPath,
    }) !== null

    return success
  }

  /**
   * 批量删除文件
   */
  async batchDeleteFiles(fileIds: string[]): Promise<number> {
    let successCount = 0
    for (const fileId of fileIds) {
      if (await this.deleteFile(fileId)) {
        successCount++
      }
    }
    return successCount
  }

  /**
   * 获取最近文件
   */
  async getRecentFiles(limit: number = 10): Promise<File[]> {
    const db = await this.db
    const result = await db.find({
      selector: {
        collection: 'files',
      },
      sort: [{ createdAt: 'desc' }],
      limit,
    })

    return result.docs.map((doc: any) => doc as File)
  }
}

// 单例导出
export const fileService = new FileService()

// 便捷函数
export function useFileService() {
  return fileService
}
