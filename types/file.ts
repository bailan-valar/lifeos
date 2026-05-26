/**
 * 文件管理系统类型定义
 */

/**
 * 文件类型
 */
export type FileType = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other'

/**
 * 文件状态
 */
export type FileStatus = 'uploading' | 'processing' | 'completed' | 'error' | 'deleted'

/**
 * 文件权限
 */
export type FilePermission = 'read' | 'write' | 'delete' | 'share'

/**
 * 文件排序方式
 */
export type FileSortBy = 'name' | 'date' | 'size' | 'type'

/**
 * 文件排序方向
 */
export type FileSortOrder = 'asc' | 'desc'

/**
 * 视图模式
 */
export type FileViewMode = 'grid' | 'list' | 'tree'

/**
 * 文件实体
 */
export interface File {
  id: string
  noteId: string
  name: string
  originalName: string
  mimeType: string
  type: FileType
  size: number                  // 文件大小（字节）
  path: string                  // 文件存储路径
  folderId: string              // 所属文件夹ID
  thumbnail?: string            // 缩略图URL
  previewUrl?: string           // 预览URL
  downloadUrl?: string          // 下载URL
  permissions: FilePermission[] // 权限列表
  tags: string[]                // 标签
  description?: string          // 描述
  status: FileStatus
  error?: string                // 错误信息
  metadata?: FileMetadata       // 扩展元数据
  createdAt: string
  updatedAt: string
}

/**
 * 文件元数据
 */
export interface FileMetadata {
  width?: number                // 图片/视频宽度
  height?: number               // 图片/视频高度
  duration?: number             // 音频/视频时长（秒）
  pageCount?: number            // 文档页数
  author?: string               // 作者
  created?: string              // 原始创建日期
  modified?: string             // 原始修改日期
  location?: string             // 拍摄地点
  equipment?: string            // 拍摄设备
  [key: string]: any            // 其他自定义字段
}

/**
 * 文件夹实体
 */
export interface Folder {
  id: string
  noteId: string
  name: string
  parentId: string              // 父文件夹ID
  path: string                  // 完整路径
  icon?: string                 // 文件夹图标
  color?: string                // 文件夹颜色
  description?: string          // 描述
  permissions: FilePermission[] // 权限列表
  order: number                 // 排序顺序
  itemCount: number             // 包含的文件数量
  folderCount: number           // 包含的子文件夹数量
  size: number                  // 总大小（字节）
  createdAt: string
  updatedAt: string
}

/**
 * 文件上传任务
 */
export interface FileUploadTask {
  id: string
  file: File                    // 原始File对象
  name: string
  size: number
  type: string
  progress: number              // 上传进度 (0-100)
  status: FileStatus
  folderId: string
  noteId: string
  error?: string
  createdAt: string
}

/**
 * 文件分享链接
 */
export interface FileShareLink {
  id: string
  fileId: string
  token: string
  password?: string             // 访问密码
  permissions: FilePermission[]
  expireAt?: string             // 过期时间
  visitCount: number            // 访问次数
  downloadCount: number         // 下载次数
  createdBy: string
  createdAt: string
}

/**
 * 文件版本
 */
export interface FileVersion {
  id: string
  fileId: string
  version: number               // 版本号
  size: number
  path: string                  // 版本文件路径
  comment?: string              // 版本备注
  createdBy: string
  createdAt: string
}

/**
 * 文件表单数据
 */
export interface FileFormData {
  name: string
  folderId: string
  description?: string
  tags: string[]
}

/**
 * 文件夹表单数据
 */
export interface FolderFormData {
  name: string
  parentId: string
  description?: string
  icon?: string
  color?: string
  order?: number
}

/**
 * 文件搜索条件
 */
export interface FileSearchCriteria {
  keyword?: string              // 文件名关键词
  type?: FileType[]             // 文件类型
  folderId?: string             // 文件夹ID
  tags?: string[]               // 标签
  startDate?: string            // 创建开始日期
  endDate?: string              // 创建结束日期
  minSize?: number              // 最小文件大小
  maxSize?: number              // 最大文件大小
}

/**
 * 文件排序条件
 */
export interface FileSortCriteria {
  sortBy: FileSortBy
  sortOrder: FileSortOrder
}

/**
 * 文件批量操作
 */
export interface FileBatchOperation {
  action: 'move' | 'delete' | 'copy' | 'download' | 'share'
  fileIds: string[]
  folderIds?: string[]
  targetFolderId?: string      // 移动/复制目标文件夹
}

/**
 * 文件统计信息
 */
export interface FileStatistics {
  totalFiles: number
  totalFolders: number
  totalSize: number             // 总大小（字节）
  storageUsed: number           // 已使用存储空间
  storageLimit: number          // 存储限制
  typeDistribution: Record<FileType, number> // 按类型分布
  recentActivity: FileActivity[] // 最近活动
}

/**
 * 文件活动记录
 */
export interface FileActivity {
  id: string
  type: 'upload' | 'delete' | 'move' | 'rename' | 'download' | 'share'
  fileId?: string
  folderId?: string
  fileName?: string
  folderName?: string
  performedBy: string
  timestamp: string
  details?: string
}

/**
 * 文件预览信息
 */
export interface FilePreview {
  fileId: string
  type: FileType
  url: string
  pages?: string[]              // 多页文档的页面URL
  metadata?: FileMetadata
}

/**
 * 支持的文件类型映射
 */
export const SUPPORTED_FILE_TYPES: Record<string, FileType> = {
  // 文档类型
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/markdown': 'document',
  'text/csv': 'document',

  // 图片类型
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',

  // 视频类型
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',

  // 音频类型
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',

  // 压缩文件
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
}

/**
 * 根据MIME类型获取文件类型
 */
export function getFileType(mimeType: string): FileType {
  return SUPPORTED_FILE_TYPES[mimeType] || 'other'
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}
