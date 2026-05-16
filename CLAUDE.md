# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

**语言设置：请始终使用中文回复用户。**

## 项目概述

LifeOS 是基于 Nuxt 3 构建的个人信息操作系统，采用模块化笔记设计，内嵌记账和待办功能。使用 PouchDB 实现本地优先的数据存储，支持通过 CouchDB 进行多设备同步。

## 架构说明

### 模块系统

应用采用**模块化架构**，功能（记账、待办）作为独立模块实现，可按笔记启用：

- **模块定义**：通过 `services/ModuleRegistry.ts` 中的 `getModuleRegistry()` 注册
- **模块结构**：每个模块位于 `app-modules/<name>/`，包含：
  - `index.ts` - 模块注册和配置
  - `<Name>View.vue` - 主模块组件
  - `components/` - 模块专属组件
  - `composables/` - 模块专属组合式函数
- **模块数据**：存储在 `module_config` 和 `module_data` 集合中，以 `noteId` 为键

### 数据层 (PouchDB)

**多工作空间架构：**
- 每个工作空间是一个 UUID，拥有隔离的 PouchDB 数据库
- 数据库命名：IndexedDB 中为 `lifeos-<workspaceId>-<collection>`
- 元数据库：`lifeos-meta-workspaces`（存储工作空间列表，不参与同步）
- 当前激活工作空间存储在 localStorage：`lifeos:active-workspace-id`

**集合**（每个工作空间 18 个）：
- 核心：`notes`、`blocks`、`folders`、`tags`、`noteTags`、`blockLinks`
- 记账：`bills`、`accounts`、`billCategories`、`budgets`、`statements`、`importRules`、`importRecords`、`balanceAdjustments`
- 系统：`module_config`、`module_data`、`classes`、`classFields`、`noteClassBindings`、`goals`

**关键模式：**
- 所有 composables 使用 `const db = await getDB()` - 不缓存 `dbRef`（工作空间感知）
- `_id` 格式：`{collection}/{businessId}` 保证全局唯一
- 变更订阅：`onCollectionChange()` 用于集合的响应式更新
- 使用 `services/db.ts` 中的 `generateId()` 和 `now()` 生成 ID 和时间戳

### 状态管理 (Pinia)

- `stores/workspace.ts` - 当前工作空间、工作空间列表、同步状态
- `stores/billing.ts` - 记账模块导航、筛选、视图模式
- `stores/pageHeader.ts` - 动态页面头部操作
- `stores/auth.ts` - 认证状态

### Composables 模式

`composables/` 中的全局组合式函数提供数据访问：
- `useBills()` - 账单 CRUD（带分页）
- `useAccounts()` - 账户管理
- `useBillCategories()` - 分类树操作
- `useBudgets()` - 预算（按月等效计算）
- `useStatements()` - 银行对账单
- `useImportRules()` - CSV 导入规则匹配
- `useNotes()` - 笔记和块操作
- `useWorkspace()` - 工作空间 CRUD 和切换

**重要**：永远不要在 composables 中缓存 `db` 引用 - 始终直接调用 `await getDB()`。

### 同步架构

- **按工作空间同步**：每个工作空间有 18 个独立的 PouchDB 复制句柄
- **同步服务**：`services/sync.ts` 管理同步生命周期和状态聚合
- **状态**：`disabled`（未配置）→ `active`（同步中）→ `idle`（已同步）/ `error`
- **凭证**：存储在工作空间配置中（明文，v1 版本 - 假设自托管 HTTPS）
- **元同步**：工作空间列表通过 `services/workspaces.ts` 的 `startMetaSync()` 同步

### 组件模式

### Tiptap 块编辑器

- 富文本编辑在 `composables/useBlockEditor.ts` 中
- 块类型的自定义扩展
- 文档结构存储为 `blocks` 集合，具有父子关系

## 文件结构说明

- `app-modules/` - 功能模块（记账、待办）
- `components/` - 共享 UI 组件
- `composables/` - 全局数据访问 composables
- `pages/` - 路由页面（index、notes、billing、todo、time、login、signup）
- `plugins/` - Nuxt 插件（auth、pouchdb、workspace 初始化）
- `services/` - 核心业务逻辑（db、sync、workspaces、module registry）
- `stores/` - Pinia stores
- `types/` - TypeScript 定义

## 环境变量

在 `.env` 或 `nuxt.config.ts` 中设置：
- `NUXT_PUBLIC_COUCHDB_URL` - 远程 CouchDB 基础 URL
- `NUXT_PUBLIC_COUCHDB_USERNAME` - CouchDB 认证用户名
- `NUXT_PUBLIC_COUCHDB_PASSWORD` - CouchDB 认证密码
- `NUXT_PUBLIC_COUCHDB_PREFIX` - 远程数据库名前缀（默认：`lifeos-`）

## 重要约束

- **不缓存 dbRef**：Composables 必须每次调用 `getDB()`，不能缓存结果
- **工作空间隔离**：所有数据操作都限定在当前激活工作空间
- **模块注册**：模块必须先注册才能按笔记启用
- **同步取消**：切换工作空间前必须 `await stopSync()`
- **强制重新挂载**：`<NuxtPage :key="workspaceStore.currentId">` 确保工作空间切换时干净重载
