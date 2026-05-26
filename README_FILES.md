# 📁 LifeOS 文件管理系统

一个功能完整的文件管理系统，集成到 LifeOS 项目中，提供文件存储、组织、搜索和分享功能。

## ✨ 功能特性

### 🎯 核心功能
- **文件上传与管理**: 支持多格式文件上传，拖拽上传，进度跟踪
- **文件夹组织**: 层级文件夹结构，支持创建、移动、重命名、删除
- **文件搜索**: 多条件搜索，支持关键词、文件类型、日期范围过滤
- **视图切换**: 网格视图和列表视图，适应不同使用场景
- **批量操作**: 支持批量移动、删除文件和文件夹
- **存储统计**: 实时显示存储使用情况，文件类型分布统计

### 🎨 用户界面
- **响应式设计**: 完美适配桌面端和移动端
- **现代UI**: 采用玻璃拟态设计风格，美观流畅
- **直观操作**: 拖拽上传、右键菜单、快捷键支持
- **实时反馈**: 上传进度、操作结果实时显示

### 🔧 技术特性
- **TypeScript**: 完整的类型定义，开发体验优秀
- **模块化架构**: 与 LifeOS 现有模块完美集成
- **数据库集成**: 基于 PouchDB 的本地存储和同步
- **性能优化**: 虚拟滚动、懒加载、缓存策略

## 📁 项目结构

```
app-modules/files/
├── FilesView.vue                 # 主视图组件
├── components/
│   ├── layout/
│   │   ├── FilesSidebar.vue     # 桌面端侧边栏
│   │   └── FilesMobileTabbar.vue # 移动端Tab栏
│   ├── panels/
│   │   ├── FilesTabPanel.vue    # 文件列表面板
│   │   ├── UploadTabPanel.vue   # 上传面板
│   │   ├── SearchTabPanel.vue   # 搜索面板
│   │   └── StatsTabPanel.vue    # 统计面板
│   └── ui/                      # UI组件（待开发）
├── composables/
│   └── useFiles.ts             # 文件管理逻辑
├── stores/
│   └── files.ts                # 状态管理
├── services/
│   └── fileService.ts          # 文件服务
└── types/
    └── file.ts                 # 类型定义
```

## 🚀 快速开始

### 1. 安装依赖

确保已安装所有必要的依赖：

```bash
npm install
```

### 2. 配置数据库

文件管理系统使用 PouchDB 进行本地存储。确保已配置好数据库连接。

### 3. 集成到应用

在路由配置中添加文件管理路由：

```typescript
// pages/files.vue
<template>
  <FilesView note-id="files-note-id" />
</template>

<script setup lang="ts">
import FilesView from '~/app-modules/files/FilesView.vue'
</script>
```

### 4. 在侧边栏添加入口

在主应用的侧边栏中添加文件管理入口：

```vue
<!-- components/Sidebar.vue -->
<button @click="navigateTo('/files')">
  <Icon name="solar:folder-linear" />
  <span>文件管理</span>
</button>
```

## 💡 使用指南

### 文件上传

1. **点击上传**: 点击上传区域选择文件
2. **拖拽上传**: 直接拖拽文件到上传区域
3. **批量上传**: 支持同时上传多个文件
4. **进度跟踪**: 实时显示上传进度和状态

### 文件管理

1. **浏览文件**: 双击文件夹打开，点击面包屑导航
2. **视图切换**: 在网格视图和列表视图间切换
3. **批量选择**: 点击"选择"按钮进入批量模式
4. **文件操作**: 右键菜单进行重命名、移动、删除等操作

### 搜索文件

1. **关键词搜索**: 在搜索框输入文件名关键词
2. **类型过滤**: 勾选特定文件类型进行过滤
3. **日期范围**: 设置创建日期范围筛选
4. **标签搜索**: 支持按文件标签搜索

### 统计信息

1. **存储概览**: 查看存储空间使用情况
2. **文件统计**: 总文件数、文件夹数、总大小
3. **类型分布**: 各类文件的数量分布
4. **活动记录**: 最近的文件操作记录

## 🔌 API 接口

### 文件服务 (fileService)

```typescript
// 文件夹操作
await fileService.createFolder({
  noteId: 'note-id',
  name: '新建文件夹',
  parentId: 'root',
  description: '文件夹描述',
  icon: 'solar:folder-linear',
  color: '#007AFF'
})

await fileService.getFolder('folder-id')
await fileService.getChildFolders('parent-id')
await fileService.updateFolder('folder-id', { name: '新名称' })
await fileService.deleteFolder('folder-id')

// 文件操作
await fileService.createFile({
  noteId: 'note-id',
  name: 'file-name',
  originalName: 'original-name',
  mimeType: 'image/jpeg',
  size: 1024000,
  path: '/uploads/file.jpg',
  folderId: 'folder-id'
})

await fileService.getFile('file-id')
await fileService.getFilesInFolder('folder-id')
await fileService.updateFile('file-id', { name: '新名称' })
await fileService.deleteFile('file-id')

// 搜索操作
await fileService.searchFiles({
  keyword: '搜索关键词',
  type: ['image', 'document'],
  folderId: 'folder-id',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
})

// 统计操作
await fileService.getFileStatistics()
```

### Composable (useFiles)

```typescript
const {
  // 状态
  loading,
  error,
  files,
  folders,
  currentFolder,

  // 文件夹操作
  createFolder,
  updateFolder,
  deleteFolder,
  openFolder,
  navigateUp,

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
  getBreadcrumbs,
  getIconForFile,
  getFileSizeFormatted
} = useFiles()
```

## 🎨 自定义配置

### 支持的文件类型

可以在 `types/file.ts` 中扩展支持的文件类型：

```typescript
export const SUPPORTED_FILE_TYPES: Record<string, FileType> = {
  // 添加新的MIME类型映射
  'application/new-type': 'document',
}
```

### 存储限制

修改默认存储限制：

```typescript
// services/fileService.ts
const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024 // 10GB
```

### UI 主题

自定义颜色和样式：

```css
/* 修改主色调 */
:root {
  --files-primary-color: rgb(0, 122, 255);
  --files-border-color: rgba(0, 0, 0, 0.1);
}
```

## 🔧 开发指南

### 添加新的面板组件

1. 在 `components/panels/` 创建新组件
2. 在 `FilesView.vue` 中引入和使用
3. 在 `stores/files.ts` 添加对应的Tab ID

### 扩展文件操作

1. 在 `services/fileService.ts` 添加新方法
2. 在 `composables/useFiles.ts` 添加便捷接口
3. 在UI组件中调用新方法

### 自定义文件处理

实现文件预览、缩略图生成等功能：

```typescript
// services/fileProcessor.ts
export async function generateThumbnail(file: File): Promise<string> {
  // 实现缩略图生成逻辑
}

export async function processFileContent(file: File): Promise<any> {
  // 实现文件内容处理逻辑
}
```

## 📊 性能优化

- **虚拟滚动**: 处理大量文件时的性能优化
- **懒加载**: 按需加载文件内容和缩略图
- **缓存策略**: 智能缓存常用文件和文件夹
- **批量操作**: 减少数据库操作次数

## 🐛 已知问题

- 上传大文件时可能出现内存溢出
- 某些特殊文件类型无法正确识别
- 移动端上传功能需要进一步优化

## 🔄 更新日志

### v1.0.0 (2024-01-15)
- ✨ 初始版本发布
- 🎁 完整的文件管理功能
- 📱 响应式设计
- 🔍 搜索和过滤功能
- 📊 统计和分析功能

## 📄 许可证

MIT License

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者
- 加入讨论组

---

**注意**: 本文件管理系统是 LifeOS 项目的一部分，请确保在使用前已正确配置 LifeOS 环境。
