# LifeOS - Agent 开发指南

> 本文档面向 AI 编程助手。阅读前默认你对本项目一无所知。所有信息均基于实际代码，不做假设。

---

## 项目概述

LifeOS 是一款**个人生活管理系统**，定位为"生活操作系统"（Life Operating System）。它采用本地优先（local-first）架构，所有核心数据默认存储在浏览器 IndexedDB 中，可选通过 CouchDB 进行远端同步，也可选通过服务端账户进行工作空间元数据同步。

当前已实现三大核心模块：
- **笔记系统**：支持树形结构的块编辑器（Block Editor），基于 TipTap；每篇笔记可附加分类（Class）自定义字段
- **账单模块**：完整的记账、账户管理、分类树、预算、账单周期、CSV 导入与导入规则体系
- **目标管理**：OKR 风格的目标追踪，支持状态、优先级、时间规划和笔记关联

项目愿景、详细功能规划和 Roadmap 见 `doc/PRD-LifeOS.md`。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Nuxt 3 (Vue 3) | SPA 模式 (`ssr: false`) |
| 状态管理 | Pinia | `stores/auth.ts`、`stores/workspace.ts` |
| 样式 | Tailwind CSS + 自定义 CSS | 见 `assets/css/main.css`，大量 iOS 风格玻璃拟态 |
| 本地数据库 | PouchDB (`pouchdb-browser` + `pouchdb-find`) | 封装在 `services/db.ts`，IndexedDB 后端 |
| 富文本编辑 | TipTap 2 (大量扩展) | 见 `components/editor/`，自定义块类型 |
| 服务端 | Nuxt Nitro | `server/api/` 目录下定义 API 路由 |
| 服务端 ORM | Prisma | `prisma/schema.prisma`，PostgreSQL 后端 |
| 认证 | JWT (`jsonwebtoken`) + bcryptjs | Token 存 `localStorage`，见 `server/utils/auth.ts` |
| 图标 | `@nuxt/icon` + `@iconify-json/solar` | Solar 图标集 |
| 构建工具 | Vite (Nuxt 内置) | Node.js 运行时 |

---

## 项目结构

```
├── app-modules/           # 可插拔笔记模块
│   ├── billing/           # 账单模块（组件 + 注册逻辑）
│   └── todo/              # 目标/待办模块
├── assets/css/
│   └── main.css           # Tailwind 入口 + iOS 玻璃拟态样式 + Z-Index 变量
├── components/
│   ├── class/             # 分类（Class）管理器与字段编辑器
│   ├── editor/            # 块编辑器核心（BlockEditor、BlockList、各 block 类型、SlashMenu）
│   ├── module/            # 模块管理器 UI
│   ├── ui/                # 通用 UI（Toast、Confirm、GlassCard）
│   └── workspace/         # 工作空间相关组件（切换器、同步状态、 onboarding）
├── composables/           # Vue Composables，业务逻辑层
│   ├── useBills.ts        # 账单 CRUD + 余额联动
│   ├── useNotes.ts        # 笔记树构建
│   ├── useBlockEditor.ts  # 编辑器逻辑
│   ├── useModule.ts       # 模块生命周期管理
│   └── ...
├── pages/                 # Nuxt 页面路由
│   ├── notes.vue          # 笔记主页（左侧列表 + 右侧编辑器）
│   ├── billing.vue        # 独立账单页面
│   ├── todo.vue           # 目标管理页面
│   ├── login.vue          # 登录
│   └── signup.vue         # 注册
├── plugins/               # Nuxt 插件（按顺序执行）
│   ├── auth.init.ts       # 初始化认证状态
│   ├── pouchdb.client.ts  # 初始化 PouchDB
│   └── workspace.client.ts # 初始化工作空间 + 启动同步
├── server/api/            # API 路由
│   └── auth/              # 登录、注册、获取当前用户
├── server/utils/          # 服务端工具
│   ├── auth.ts            # JWT 签发与校验
│   └── db.ts              # PrismaClient 单例
├── services/              # 核心客户端服务
│   ├── db.ts              # PouchDB 封装（单数据库架构）
│   ├── sync.ts            # CouchDB 双向实时同步（单 sync handle）
│   ├── workspaces.ts      # 工作空间本地/远端 CRUD
│   ├── ModuleRegistry.ts  # 模块注册表
│   └── csvImport.ts       # CSV 导入解析逻辑
├── stores/                # Pinia Stores
│   ├── auth.ts            # 用户认证状态
│   └── workspace.ts       # 工作空间状态与切换逻辑
├── types/                 # TypeScript 类型定义
│   ├── block.ts           # 块、笔记、文件夹、标签、分类等类型
│   ├── bill.ts            # 账单、账户、分类、预算等类型
│   ├── module.ts          # 模块系统类型
│   └── workspace.ts       # 工作空间与同步状态类型
├── prisma/schema.prisma   # Prisma 数据模型（PostgreSQL）
├── nuxt.config.ts         # Nuxt 配置（SPA、模块、运行时配置）
├── tailwind.config.js     # Tailwind + 自定义 iOS 颜色/阴影
├── package.json           # 依赖与脚本
└── ecosystem.config.cjs   # PM2 配置（开发模式）
```

---

## 构建与开发命令

```bash
# 安装依赖
npm install

# 开发服务器（默认端口 3000）
npm run dev

# 生产构建
npm run build

# 静态生成（如需要）
npm run generate

# 类型检查
npm run typecheck

# ESLint 检查
npm run lint

# PM2 启动（按项目习惯）
pm2 start ecosystem.config.cjs
```

> 注意：`.env` 文件需自行配置。参考 `.env.example`：需要 `DATABASE_URL`（PostgreSQL）、`JWT_SECRET`，以及可选的 CouchDB 同步配置。

---

## 数据架构（本地优先）

### PouchDB 数据层

项目使用 `pouchdb-browser` + `pouchdb-find` 作为本地数据层。封装在 `services/db.ts` 中，对外暴露友好的 wrapper API：

- `db.<collection>.find(opts)` → 返回 `Query<DBDoc[]>`
- `db.<collection>.findOne(idOrOpts)` → 返回 `Query<DBDoc | null>`
- `db.<collection>.insert(data)` / `db.<collection>.upsert(data)`
- `doc.toJSON()` / `doc.get(field)` / `doc.patch(partial)` / `doc.update({$set})` / `doc.remove()`

### 单数据库架构

**每个工作空间只创建一个 PouchDB 实例**，数据库名为 `lifeos-<workspaceId>`。所有集合的文档存储在同一个数据库中，通过 `_id` 前缀和 `collection` 字段区分集合类型。

- 文档 `_id` 格式：`{collection}/{businessId}`（例：`blocks/1736abc`、`notes/1736def`）
- 每个文档附带 `collection` 字段，值为集合名（例：`"blocks"`），用于 Mango 查询的集合级过滤
- `toJSON()` 会自动剥离 `_id`、`_rev`、`collection`，只暴露业务字段和 `id`

集合和索引在 `services/db.ts` 的 `COLLECTION_INDEXES` 中声明。Mango 索引以 `collection` 为首字段，确保按集合过滤后可利用后续字段排序。

已声明的集合包括：`blocks`、`notes`、`folders`、`tags`、`noteTags`、`blockLinks`、`classes`、`classFields`、`noteClassBindings`、`module_config`、`module_data`、`goals`、`accounts`、`billCategories`、`bills`、`budgets`、`statements`、`importRules`、`importRecords`。

**添加新集合的步骤**：
1. 在 `COLLECTION_INDEXES` 中添加 `<集合名>: [[...索引字段组], ...]`
2. 在 `types/` 下定义对应 TypeScript 类型（无 schema 校验，类型即契约）
3. 写一个 composable 封装 CRUD（参考 `composables/useBills.ts`）

### 文档字段约定

- `id`（业务字段）会被 wrapper 映射到 PouchDB 的 `_id`（格式：`{collection}/{id}`）；不要手写 `_id`
- `_rev` 由 PouchDB 内部维护，`toJSON()` 已剥离；不要在业务对象里出现
- `collection` 为内部字段，由 wrapper 自动管理；业务代码不要读取或写入
- 业务侧可保留 `version` 字段作乐观锁计数，与 PouchDB `_rev` 互不冲突

### 多工作空间隔离

- 每个工作空间用 UUID v4 作为 `workspaceId`，对应一个独立的 PouchDB 数据库 `lifeos-<workspaceId>`
- `services/workspaces.ts` 提供工作空间本地 CRUD（写入 `lifeos-meta-workspaces-{userId}`），并通过 CouchDB 实时同步空间列表
- `stores/workspace.ts`（Pinia）协调切换：`switchTo(id)` 顺序为 `stopSync → closeWorkspaceDB → setActiveId → initDB → startSync`
- `app.vue` 给 `<NuxtPage>` 绑定 `:key="workspaceStore.currentId"`，切换空间时强制重渲染

### 远端 CouchDB 同步

- `services/sync.ts` 封装 PouchDB 原生 `db.sync(remote, { live: true, retry: true })`，每个工作空间只需一个 sync handle
- 远端数据库名：`<remotePrefix><workspaceId>`（例：`lifeos-abc123`）
- 冲突策略沿用 PouchDB 默认的 last-write-wins，不做应用层合并
- 工作空间未配置 `remoteUrl` 时同步状态为 `disabled`，业务读写完全本地

### 空间列表同步（CouchDB）

- 登录用户的空间列表通过独立的 CouchDB 数据库实时同步：本地 `lifeos-meta-workspaces-{userId}` ↔ 远端 `{remotePrefix}meta-{userId}`
- `services/workspaces.ts` 中 `startMetaSync()` 启动实时同步（`live: true, retry: true`）
- Guest 用户仅使用本地存储，不同步到远端
- 空间列表和业务数据使用同一套 CouchDB 服务器（复用 `NUXT_PUBLIC_COUCHDB_*` 配置），但数据库独立
- 实际业务数据（账单、笔记等）仍走各工作空间独立的 PouchDB ↔ CouchDB 同步通道

---

## 模块系统（Module System）

LifeOS 为笔记设计了可插拔模块架构，定义在 `types/module.ts`、实现在 `services/ModuleRegistry.ts`。

- 模块通过 `getModuleRegistry().register(moduleConfig)` 注册
- 当前已注册模块：`billing`（账单）、`todo`（目标）
- 每个模块可绑定到单篇笔记，通过 `module_config` 集合控制 `enabled` 状态
- 模块数据存储在 `module_data` 集合中（`noteId + moduleId` 联合查询）
- 笔记视图切换器 `NoteViewSwitcher.vue` 目前直接硬编码了三个 Tab：内容、待办、账单

模块生命周期钩子：`onLoad`、`onUnload`、`onActivate`、`onDeactivate`、`onDataChange`。

---

## 代码风格与约定

### 语言

- 源代码中的注释、变量命名、UI 文本以**中文**为主
- Git 提交信息使用中文描述（见下方提交规范）
- 类型定义和 composable 以英文命名，符合 Vue/Nuxt 生态习惯

### Git 提交规范

格式：`type: 中文描述`（主题必填，冒号后中文，末尾不加句号）

| 类型 | 含义 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `refactor` | 重构 |
| `style` | 格式调整 |
| `chore` | 构建流程、依赖、工具链 |
| `docs` | 仅文档变更 |
| `test` | 添加或更新测试 |
| `perf` | 性能优化 |
| `revert` | 回滚 |

**多项变更**（一次提交多个独立改动）：每条各占一行，按重要性从高到低排列。

示例：
```
feat: 添加块编辑器的 todo 块类型
fix: 修复 folderId 为 null 时的数据库错误
```

### TypeScript

- 启用 `strict: true`
- Composables 返回 reactive 对象，业务组件直接解构使用
- 数据库文档通过 `doc.toJSON()` 转为纯对象后再赋值给 `ref`
- ID 生成：`services/db.ts` 中的 `generateId()` 使用 `Date.now()-随机字符串`

### Vue 组件风格

- 使用 `<script setup lang="ts">`
- 样式大量采用 **Scoped CSS** + iOS 玻璃拟态设计（backdrop-filter、半透明白色背景、0.5px 边框）
- 弹框统一使用 `<Teleport to="body">` + `.dialog-overlay` 包裹
- 图标统一使用 `<Icon name="solar:xxx-linear" />`

---

## 全局样式限制 — iOS 26 Liquid Glass

本项目所有 UI 组件的视觉风格必须统一遵循 **iOS 26 Liquid Glass（液态玻璃）** 设计规范。Liquid Glass 是一种高阶玻璃拟态（Glassmorphism）风格，核心特征为光学级模糊、厚度层次、折射高光与流动光泽。

### 设计原则

1. **优先使用 Liquid Glass 组件类**：所有新组件必须优先使用 `liquid-glass-*` 系列类名，而非 legacy 的 `ios-*` 或 `glass-*` 类（保留兼容但不再扩展）
2. **禁止硬编码 glass 数值**：所有模糊度、边框、阴影、圆角必须引用 `main.css` `:root` 中的 CSS 变量（`--liquid-*`），禁止在组件 scoped style 中手写 `backdrop-filter: blur(20px)` 等固定值
3. **折射高光强制要求**：所有导航栏、弹框、侧边栏、卡片等「承载层级」的容器必须添加 `.liquid-glass-refraction` 类（或伪元素），产生顶部光线折射效果
4. **0.5px 边框**：所有 glass 容器必须使用 `0.5px` 物理像素边框，通过 `border: var(--liquid-border)` 实现
5. **内外阴影组合**：必须通过 `inset` 内高光 + 外阴影模拟玻璃厚度，禁止仅用单一阴影
6. **深色模式兼容**：所有 glass 样式必须同时支持浅色/深色模式（通过 `prefers-color-scheme: dark` 或 `.dark` 类切换 `--liquid-bg*` 变量）
7. **交互反馈**：可交互元素（按钮、列表项、卡片）必须提供 `hover/active` 状态，使用 `liquid-glass-hover` / `liquid-glass-active` 或自定义 transition

### Liquid Glass 组件类速查

| 类名 | 用途 | 必须组合 |
|------|------|---------|
| `.liquid-glass` | 基础玻璃容器 | `.liquid-glass-refraction`（可选） |
| `.liquid-glass-thick` | 厚玻璃（导航、侧边栏） | `.liquid-glass-refraction` |
| `.liquid-glass-thin` | 薄玻璃（次级浮层） | — |
| `.liquid-glass-nav` | 导航栏/标题栏 | 已内置 refraction |
| `.liquid-glass-sheet` | 底部弹层 | 已内置 refraction |
| `.liquid-glass-card` | 卡片 | 已内置 refraction + hover 动效 |
| `.liquid-glass-sidebar` | 侧边栏 | 已内置 refraction |
| `.liquid-glass-dialog` | 弹框/Dialog | 已内置 refraction |
| `.liquid-glass-overlay` | 模态遮罩 | — |
| `.liquid-glass-button` | 按钮 | 已内置 refraction + active 动效 |
| `.liquid-glass-button-primary` | 主按钮（蓝色） | 已内置 refraction |
| `.liquid-glass-button-danger` | 危险按钮（红色） | 已内置 refraction |
| `.liquid-glass-input` | 输入框 | — |
| `.liquid-glass-list-item` | 列表项 | — |
| `.liquid-glass-fab` | 悬浮按钮 | 已内置 refraction |
| `.liquid-glass-shimmer` | 动态光泽动画 | — |
| `.liquid-glass-transition` | 统一过渡动画 | — |

### Tailwind Token 速查

新代码优先使用 Tailwind utility 配合 Liquid Glass Token：

```html
<!-- 示例：用 Tailwind + Liquid Glass Token 构建卡片 -->
<div class="liquid-glass liquid-glass-refraction rounded-ios p-4 shadow-liquid">
  <h3 class="liquid-text-primary font-semibold">标题</h3>
  <p class="liquid-text-secondary text-sm">描述文字</p>
</div>
```

| Token 类别 | 关键值 |
|-----------|-------|
| Colors | `bg-liquid-bg`, `bg-liquid-bg-thick`, `border-liquid-border`, `text-liquid-*` |
| Shadows | `shadow-liquid`, `shadow-liquid-strong`, `shadow-liquid-nav`, `shadow-liquid-sheet` |
| Backdrop Blur | `backdrop-blur-2xl` (24px), `backdrop-blur-3xl` (32px), `backdrop-blur-4xl` (40px) |
| Border Radius | `rounded-ios` (20px), `rounded-ios-lg` (24px), `rounded-ios-xl` (32px) |
| Background Image | `bg-liquid-refraction`, `bg-liquid-shimmer` |
| Animation | `animate-liquid-shimmer` |

### 新增组件时的 checklist

- [ ] 是否使用了 `.liquid-glass-*` 系列类而非 legacy 类？
- [ ] 容器类组件是否添加了折射高光（`.liquid-glass-refraction` 或内置）？
- [ ] 是否使用了 CSS 变量（`var(--liquid-*)`）而非硬编码数值？
- [ ] 交互元素是否有 `hover/active` 状态反馈？
- [ ] 弹框/浮层是否正确使用了 Z-Index 变量体系？
- [ ] 是否测试了深色模式下的视觉效果？

---

## UI/UX 规范

### Z-Index 层级体系

所有 `Teleport to="body"` 的弹框/浮层必须使用 `assets/css/main.css` 中定义的 CSS 变量，**禁止硬编码数字**。

| 变量 | 数值 | 用途 |
|------|------|------|
| `--z-drawer` | 200 | 抽屉（ClassDrawer） |
| `--z-modal` | 300 | 基础弹框 overlay |
| `--z-modal-nested` | 400 | 嵌套弹框 |
| `--z-picker` | 450 | 下拉选择面板 |
| `--z-dropdown` | 460 | 下拉菜单、编辑器浮动菜单 |
| `--z-toast` | 500 | Toast 通知 |
| `--z-confirm` | 600 | 确认弹框（阻塞式） |
| `--z-drag` | 700 | 拖拽覆盖层 |

**关键设计**：`picker (450) > 嵌套弹框 (400)`，确保 picker 面板始终位于其宿主弹框之上。

**账单模块弹框架构**：
- Layer 1（`--z-modal`）：BillDialog、AccountDialog、CategoryDialog、BudgetDialog、StatementDialog、ImportDialog、RuleDialog
- Layer 2（`--z-modal-nested`）：ImportRecordDetail、BillBatchEditDialog、ImportRuleDialog
- Layer 3（`--z-picker` / `--z-dropdown`）：各 Picker 面板

跨弹框联动由 `BillingView.vue` 统一协调（关闭源弹框 → 打开目标弹框 → 通过 `defineExpose` setter 回写数据）。

### 新增弹框时

1. 优先封装为独立的 `XxxDialog.vue` 组件
2. 如果是"从现有弹框中打开的新弹框" → `--z-modal-nested`
3. 如果是独立的业务弹框 → `--z-modal`
4. 如果现有层级不够用，先在 `main.css` 的 `:root` 中扩展变量

---

## 测试策略

当前测试基础设施较轻薄：

- 已安装 `@playwright/test`，但项目中**尚无现成测试用例**
- 有 `npm run typecheck`（`vue-tsc`）用于静态类型检查
- 有 `npm run lint`（ESLint）用于代码风格检查

**建议的补充**：
- 关键 composables（如 `useBills.ts`、`useNotes.ts`）可写单元测试
- 账单导入流程、块编辑器核心交互适合用 Playwright 写 E2E 测试

---

## 部署与运行

### 开发环境

```bash
# 1. 准备 PostgreSQL 数据库，配置 DATABASE_URL
# 2. 执行 Prisma 迁移（如需要）
npx prisma migrate dev

# 3. 启动开发服务器
npm run dev
```

### 生产部署

- 使用 `npm run build` 生成 `.output/`
- 可通过 PM2 管理：`ecosystem.config.cjs` 提供了开发模式配置示例
- 运行时依赖环境变量：`DATABASE_URL`、`JWT_SECRET`、`NUXT_PUBLIC_API_BASE`
- CouchDB 同步配置为可选：`NUXT_PUBLIC_COUCHDB_URL`、`NUXT_PUBLIC_COUCHDB_USERNAME`、`NUXT_PUBLIC_COUCHDB_PASSWORD`

---

## 安全注意事项

1. **JWT Secret**：`JWT_SECRET` 必须设置为强随机字符串，用于签发和校验用户 Token
2. **密码存储**：用户密码使用 `bcryptjs` 哈希后存入 PostgreSQL，不存明文
3. **本地 Token**：登录后 JWT 存入 `localStorage`，所有需要认证的 API 请求通过 `Authorization: Bearer <token>` 头部发送
4. **CouchDB 凭据**：工作空间的 CouchDB 密码在本地 PouchDB 中通过 `crypto.ts` 加密存储（以 `userId` 为密钥）；元数据同步复用全局 CouchDB 配置（`NUXT_PUBLIC_COUCHDB_*`）
5. **服务端权限**：`server/api/auth/*` 为公开路由；空间列表不再走服务端 REST API，完全由 CouchDB 负责同步
6. **数据隔离**：工作空间通过不同的 IndexedDB 数据库（`lifeos-{workspaceId}`）实现客户端数据隔离，但同一浏览器内所有工作空间数据均可被访问

---

## 关键文件速查

| 需求 | 文件 |
|------|------|
| 看技术栈和依赖 | `package.json`、`nuxt.config.ts` |
| 看数据模型 | `prisma/schema.prisma`、`types/block.ts`、`types/bill.ts` |
| 看本地数据库 API | `services/db.ts` |
| 看同步逻辑 | `services/sync.ts` |
| 看工作空间管理 | `services/workspaces.ts`、`stores/workspace.ts` |
| 看认证逻辑 | `stores/auth.ts`、`server/utils/auth.ts` |
| 看模块系统 | `types/module.ts`、`services/ModuleRegistry.ts`、`composables/useModule.ts` |
| 看账单业务 | `composables/useBills.ts`、`app-modules/billing/` |
| 看编辑器 | `components/editor/BlockEditor.vue`、`composables/useBlockEditor.ts` |
| 看 UI 规范 | `assets/css/main.css`、`CLAUDE.md`（Z-Index、弹框规范） |
| 看产品需求 | `doc/PRD-LifeOS.md` |
