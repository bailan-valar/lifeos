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

## 样式规范：iOS 26 Liquid Glass

### 设计系统

项目采用 iOS 26 Liquid Glass 设计语言，所有样式变量定义在 `assets/css/main.css` 中。

### 核心原则

**禁止硬编码样式值**：所有颜色、模糊度、圆角、阴影等必须使用 CSS 变量。

### CSS 变量速查

| 类别 | 变量 | 值 |
|------|------|-----|
| 模糊 | `--liquid-blur` | 20px |
| 模糊-导航 | `--liquid-blur-nav` | 24px |
| 模糊-加厚 | `--liquid-blur-thick` | 32px |
| 饱和度 | `--liquid-saturate` | 180% |
| 背景-标准 | `--liquid-bg` | rgba(255,255,255,0.15) |
| 背景-加厚 | `--liquid-bg-thick` | rgba(255,255,255,0.22) |
| 背景-薄 | `--liquid-bg-thin` | rgba(255,255,255,0.10) |
| 圆角-标准 | `--liquid-radius` | 20px |
| 圆角-按钮 | `--liquid-radius-button` | 14px |

### 组件类名

- `.liquid-glass` - 标准玻璃效果
- `.liquid-glass-thick` / `.liquid-glass-thin` - 加厚/薄玻璃
- `.liquid-glass-nav` - 导航栏
- `.liquid-glass-card` - 卡片
- `.liquid-glass-sidebar` - 侧边栏
- `.liquid-glass-button` - 按钮
- `.liquid-glass-input` - 输入框
- `.liquid-glass-select` - 下拉选择框
- `.liquid-glass-dialog` - 弹框
- `.liquid-glass-sheet` - 底部弹层
- `.liquid-glass-refraction` - 折射高光（组合类）

### 使用示例

```html
<!-- 按钮 -->
<button class="liquid-glass-button">取消</button>
<button class="liquid-glass-button liquid-glass-button-primary">确认</button>

<!-- 输入框 -->
<input type="text" class="liquid-glass-input" placeholder="请输入..." />
<textarea class="liquid-glass-input" rows="3" placeholder="多行文本"></textarea>

<!-- 下拉选择框 -->
<select class="liquid-glass-select">
  <option value="">请选择</option>
  <option value="option1">选项1</option>
  <option value="option2">选项2</option>
</select>

<!-- 卡片 -->
<div class="liquid-glass-card">
  <p>内容</p>
</div>

<!-- 带高光的侧边栏 -->
<aside class="liquid-glass-sidebar liquid-glass-refraction">
  <nav>...</nav>
</aside>
```

### 样式约束

```css
/* ❌ 错误：硬编码 */
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
border-radius: 20px;

/* ✅ 正确：使用变量 */
background: var(--liquid-bg);
backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
border-radius: var(--liquid-radius);
```

### 下拉选择框规范

**必须使用** `.liquid-glass-select` 类名，禁止自定义下拉框样式：

```html
<!-- ❌ 错误：自定义样式或使用裸 select -->
<select style="padding: 10px; border: 1px solid #ccc;">
  <option>选项</option>
</select>

<!-- ✅ 正确：使用标准类名 -->
<select class="liquid-glass-select">
  <option>选项</option>
</select>
```

**下拉框特性：**
- 自动添加右侧箭头图标（SVG）
- Focus 时蓝色边框和阴影高亮
- 使用 Liquid Glass 背景（毛玻璃效果）
- 与输入框 `.liquid-glass-input` 保持一致的视觉风格

### 深色模式

深色模式通过 `@media (prefers-color-scheme: dark)` 自动切换变量值，组件无需额外处理。

详细规范见 [STYLE_GUIDE.md](STYLE_GUIDE.md)

## 图标使用规范

项目使用 `@nuxt/icon` + `@iconify-json/solar`，Solar 图标集已本地安装。

### 核心原则

**禁止硬编码图标名称字符串**：必须使用 `composables/useIcons.ts` 中定义的图标常量。

### 使用方式

```vue
<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
</script>

<template>
  <!-- 方式1: 使用扁平常量 -->
  <Icon :name="ICONS.addCircle" />

  <!-- 方式2: 使用分类常量（推荐） -->
  <Icon :name="SOLAR_ICONS.action.add" />
  <Icon :name="SOLAR_ICONS.editor.bold" />
  <Icon :name="SOLAR_ICONS.nav.back" />
</template>
```

### 图标分类

`SOLAR_ICONS` 按功能分类组织：

| 分类 | 说明 | 示例 |
|------|------|------|
| `editor` | 文本编辑 | `bold`, `italic`, `underline`, `strikeThrough` |
| `action` | 通用操作 | `add`, `edit`, `delete`, `save` |
| `nav` | 导航箭头 | `back`, `forward`, `up`, `down` |
| `doc` | 文档相关 | `default`, `text`, `notebook` |
| `search` | 搜索 | `default`, `minimal` |
| `settings` | 设置/认证 | `gear`, `login`, `logout` |
| `status` | 状态指示 | `success`, `error`, `warning` |

### 约束

```html
<!-- ❌ 错误：硬编码图标名称 -->
<Icon name="solar:add-circle-linear" />
<Icon :name="`solar:${iconName}-linear`" />

<!-- ✅ 正确：使用常量 -->
<Icon :name="SOLAR_ICONS.action.add" />
<Icon :name="ICONS.addCircle" />
```

### 添加新图标

1. 在 https://icones.js.org/ 搜索验证图标名称
2. 在 `composables/useIcons.ts` 中添加常量
3. IDE 自动在所有文件中可用

详细图标列表见 [composables/useIcons.ts](composables/useIcons.ts)
