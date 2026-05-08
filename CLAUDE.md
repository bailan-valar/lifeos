# Git 提交信息规范

## 格式

单项变更：

```
<type>: <subject>

<body> (可选)
```

多项变更（一次提交包含多个独立改动）：每条变更各占一行，类型前缀必须重复。

```
<type1>: <subject1>
<type2>: <subject2>
<type3>: <subject3>

<body> (可选)
```

## 类型

| 类型 | 含义 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `refactor` | 重构（既不修复 bug 也不添加功能） |
| `style` | 格式调整（空格、分号等），不涉及代码逻辑变更 |
| `chore` | 构建流程、依赖、工具链 |
| `docs` | 仅文档变更 |
| `test` | 添加或更新测试 |
| `perf` | 性能优化 |
| `revert` | 回滚之前的提交 |

## 规则

1. **主题**必填，冒号后使用中文描述
2. 主题行**末尾不加句号**
3. 使用**动词原形**开头："添加"不是"添加了"，"修复"不是"修复了"
4. **正文**可选；用于解释变更的*原因*
5. 主题尽量控制在 72 个字符以内
6. **多项变更**：当一次提交包含多个独立改动时，每条变更各占一行（不空行分隔），按重要性从高到低排列；如果改动可以归并为同一主题，优先合并为单条而不是拆分

## 示例

单项变更：

```
feat: 添加块编辑器的 todo 块类型
```

```
fix: 修复 folderId 为 null 时的 RxDB 代理错误
```

```
refactor: 将块聚焦逻辑提取为 useBlockFocus composable
```

多项变更（每条独立列一行）：

```
refactor: 数据层从 RxDB 迁移至 PouchDB
feat: 账单模块新增账户管理、分类树与入账出账账户
refactor: 将任务模块重命名为目标
fix: 有序列表序号按缩进层级独立计数
```

```
feat: 实现笔记树形结构与拖拽排序
chore: 将 RxDB schema 从 v4 迁移至 v7
```

---

# PouchDB 数据层规范

项目使用 PouchDB（`pouchdb-browser` + `pouchdb-find`）作为本地数据层。封装在 [services/db.ts](services/db.ts) 中，对外暴露 RxDB 风格的 wrapper（`find/findOne/insert/upsert` + `doc.toJSON/get/patch/update/remove`）以减少调用点改动。

## 单数据库架构

**每个工作空间只创建一个 PouchDB 实例**，数据库名为 `lifeos-{workspaceId}`。所有集合的文档存储在同一个数据库中：
- 文档 `_id` 格式：`{collection}/{businessId}`（例：`blocks/1736abc`）
- 每个文档附带 `collection` 字段（例：`"blocks"`），用于 Mango 查询的集合级过滤
- `toJSON()` 自动剥离 `_id`、`_rev`、`collection`，只暴露业务字段和 `id`

## 集合

集合和索引在 [services/db.ts](services/db.ts) 的 `COLLECTION_INDEXES` 中声明。Mango 索引以 `collection` 为首字段。

## 添加新集合

1. 在 `COLLECTION_INDEXES` 中添加 `<集合名>: [...索引字段组]`
2. 在 [types/](types/) 下定义对应 TypeScript 类型（无 schema 校验，类型即契约）
3. 写一个 composable 封装 CRUD（参考 [composables/useBills.ts](composables/useBills.ts)）

## 索引规则

- 索引以 `collection` 为首字段，在 [services/db.ts](services/db.ts) 初始化时自动加上
- 用于 `find({ selector: { fieldA: ..., fieldB: ... } })` 的字段需在 `COLLECTION_INDEXES` 中声明
- 用于 `sort: [{ fieldX: 'asc' }]` 的字段也需声明（wrapper 会自动把 sort 字段加进 selector）
- 复合索引顺序敏感：`['noteId', 'order']` 仅对包含 `noteId` 等值条件的查询有效

## 文档字段

- `id`（业务字段）会被 wrapper 映射到 PouchDB 的 `_id`（格式：`{collection}/{id}`）；不要手写 `_id`
- `_rev` 由 PouchDB 内部维护，`toJSON()` 已剥离；不要在业务对象里出现
- `collection` 为内部字段，由 wrapper 自动管理；业务代码不要读取或写入
- 业务侧可保留 `version` 字段作乐观锁计数，与 PouchDB `_rev` 互不冲突

## 数据迁移

- [services/migration.ts](services/migration.ts) 负责从旧的「每集合一个数据库」格式迁移到新的单数据库格式
- 迁移是幂等的，通过 per-workspace localStorage 标志位控制
- `initDB()` 在初始化前自动调用迁移，无需手动触发

## 旧数据清理

[plugins/pouchdb.client.ts](plugins/pouchdb.client.ts) 在首次加载时清理 `rxdb-dexie-*` / 旧 per-collection 数据库，幂等性靠 `localStorage['lifeos:legacy-rxdb-cleared']` 控制；同时调用 `ensureBootstrapWorkspace()` 保证至少存在一个本地工作空间并写入 activeId。

---

# 工作空间与远端同步

## 多工作空间隔离

- 每个工作空间用 UUID v4 作为 `workspaceId`，对应一个 PouchDB 数据库 `lifeos-{workspaceId}`，跨空间天然隔离
- [services/workspaces.ts](services/workspaces.ts) 提供工作空间 CRUD（写入 `lifeos-meta-workspaces-{userId}`），并维护 `localStorage['lifeos:active-workspace-id']`
- [stores/workspace.ts](stores/workspace.ts)（Pinia）协调切换：`switchTo(id)` 顺序为 `stopSync → closeWorkspaceDB → setActiveId → initDB → startSync`
- [app.vue](app.vue) 给 `<NuxtPage>` 绑定 `:key="workspaceStore.currentId"`，切换空间时强制重渲染，触发各 composable 的 `loadX()` 在新空间重新加载

## 远端 CouchDB 同步

- [services/sync.ts](services/sync.ts) 封装 PouchDB 原生 `db.sync(remote, { live: true, retry: true, batch_size: 500, batches_limit: 5 })`，每个工作空间只需一个 sync handle
- 远端数据库名：`<remotePrefix><workspaceId>`（例：`lifeos-abc123`）
- 冲突策略沿用 PouchDB 默认的 last-write-wins，不做应用层合并
- `subscribeStatus(workspaceId, fn)` 暴露同步状态（`disabled / idle / active / paused / error`）+ pendingPush/pendingPull 计数，供菜单栏徽章订阅
- 工作空间未配置 `remoteUrl` 时同步状态为 `disabled`，业务读写完全本地

---

---

# PM2 服务

| 端口 | 名称 | 类型 |
|------|------|------|
| 3000 | lifeos-3000 | Nuxt 3 |

**终端命令：**
```bash
pm2 start ecosystem.config.cjs   # 首次启动
pm2 start all                    # 首次之后
pm2 stop all / pm2 restart all
pm2 start lifeos-3000 / pm2 stop lifeos-3000
pm2 logs / pm2 status / pm2 monit
pm2 save                         # 保存进程列表
pm2 resurrect                    # 恢复保存的列表
```

**Claude 命令：** /pm2-all, /pm2-all-stop, /pm2-3000, /pm2-3000-stop, /pm2-logs, /pm2-status

---

# 调试规范

## 反复修复未果时的处理

如果同一问题经多次尝试仍未解决，应：

1. **增加调试信息**：在关键路径添加 `console.log` 或断点，输出中间状态、输入参数和返回值
2. **缩小范围**：通过注释或条件分支隔离可疑代码段，确认问题触发点
3. **测试确认**：在修复后编写最小复现步骤或临时测试用例，验证问题是否真正解决
4. **回退检查**：如果修改导致新问题，优先回退到上一个稳定状态，而非在错误基础上继续修补

---

# Z-Index 层级规范

所有 `Teleport to="body"` 的弹框/浮层必须使用 `assets/css/main.css` 中定义的 CSS 变量，**禁止硬编码数字**。

## 层级变量

| 变量 | 数值 | 用途 |
|------|------|------|
| `--z-drawer` | 200 | 抽屉（ClassDrawer） |
| `--z-modal` | 300 | 基础弹框 overlay |
| `--z-modal-nested` | 400 | 嵌套弹框（从弹框中打开的弹框） |
| `--z-picker` | 450 | 下拉选择面板（AccountPicker、CategoryPicker、NotePicker、DateTimePicker） |
| `--z-dropdown` | 460 | 下拉菜单、编辑器浮动菜单（SlashMenu、BlockList 右键菜单） |
| `--z-toast` | 500 | Toast 通知 |
| `--z-confirm` | 600 | 确认弹框（阻塞式，最高优先级） |
| `--z-drag` | 700 | 拖拽覆盖层 |

**关键设计：picker (450) > 嵌套弹框 (400)**，确保 picker 面板始终位于其宿主弹框之上，避免被覆盖。

## 账单模块弹框架构

每种业务弹框封装为独立组件，**禁止使用 `dialogType` 切换的"万能弹框"模式**。

```
Layer 1: 业务弹框 (--z-modal = 300)
  ├─ BillDialog        记账表单
  ├─ AccountDialog     账户表单
  ├─ CategoryDialog    分类表单
  ├─ BudgetDialog      预算表单
  ├─ StatementDialog   账单周期表单
  ├─ StatementListDialog  账单周期列表
  ├─ ImportDialog      导入流程容器
  └─ RuleDialog        导入规则表单

Layer 2: 嵌套弹框 (--z-modal-nested = 400)
  ├─ ImportRecordDetail    从 ImportDialog 打开
  ├─ BillBatchEditDialog   从 bill list 打开
  └─ ImportRuleDialog      从 ImportRecordDetail 打开

Layer 3: 浮层 (--z-picker = 450 / --z-dropdown = 460)
  └─ 各 Picker 面板（始终高于宿主弹框）
```

## 跨弹框联动

当 Layer 2 弹框需要触发 Layer 1 操作（如新增账户、新增分类）时，由 `BillingView.vue` 统一协调：

1. 关闭触发源（Layer 2 弹框）
2. 打开目标弹框（Layer 1 弹框）
3. 创建成功后通过 `defineExpose` 暴露的 setter（如 `setCategoryId`、`setFromAccountId`）回写到调用源

参考 `BillingView.vue` 中 `handleCreateAccount` / `handleOpenCategoryForm` / `handleOpenImportRuleDialog` / `handleCategoryConfirm` 的实现。

## 使用规则

1. **Picker 类面板**：`z-index: var(--z-picker);`
2. **业务弹框**（独立功能弹框）：`z-index: var(--z-modal);`
3. **嵌套弹框**（从其他弹框中打开）：`z-index: var(--z-modal-nested);`
4. **同层弹框** z-index 相同时，后挂载的（DOM 顺序靠后）自动在上层
5. **页面内固定元素**（侧边栏、顶部栏等）不强制使用此体系

## 新增弹框时

1. 优先封装为独立的 `XxxDialog.vue` 组件，内部用 `<Teleport to="body">` + `<div class="dialog-overlay">` 包裹
2. 如果是"从现有弹框中打开的新弹框" → `--z-modal-nested`
3. 如果是独立的业务弹框 → `--z-modal`
4. 如果现有层级不够用，先在 `main.css` 的 `:root` 中扩展变量
