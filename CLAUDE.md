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

项目使用 PouchDB（`pouchdb-browser` + `pouchdb-find`）作为本地数据层。封装在 [services/db.ts](services/db.ts) 中，对外暴露 RxDB-风格的 wrapper（`find/findOne/insert/upsert` + `doc.toJSON/get/patch/update/remove`）以减少调用点改动。

## 集合（数据库）

每个集合是一个独立的 PouchDB 实例，命名前缀 `lifeos-`（例：`lifeos-blocks`、`lifeos-notes`）。在 [services/db.ts](services/db.ts) 的 `COLLECTION_INDEXES` 中声明集合及其 mango 索引。

## 添加新集合

1. 在 `COLLECTION_INDEXES` 中添加 `<集合名>: [...索引字段组]`
2. 在 [types/](types/) 下定义对应 TypeScript 类型（无 schema 校验，类型即契约）
3. 写一个 composable 封装 CRUD（参考 [composables/useBills.ts](composables/useBills.ts)）

## 索引规则

- 用于 `find({ selector: { fieldA: ..., fieldB: ... } })` 的字段需建索引
- 用于 `sort: [{ fieldX: 'asc' }]` 的字段也需建索引（wrapper 会自动把 sort 字段加进 selector）
- 复合索引顺序敏感：`['noteId', 'order']` 仅对包含 `noteId` 等值条件的查询有效

## 文档字段

- `id`（业务字段）会被 wrapper 同步到 PouchDB 的 `_id`；不要手写 `_id`
- `_rev` 由 PouchDB 内部维护，`toJSON()` 已剥离；不要在业务对象里出现
- 业务侧可保留 `version` 字段作乐观锁计数，与 PouchDB `_rev` 互不冲突

## 旧 RxDB 数据清理

[plugins/pouchdb.client.ts](plugins/pouchdb.client.ts) 在首次加载时清理 `rxdb-dexie-*` / `lifeos-notes-*` 旧 IndexedDB 数据库，幂等性靠 `localStorage['lifeos:legacy-rxdb-cleared']` 控制；同时调用 `ensureBootstrapWorkspace()` 保证至少存在一个本地工作空间并写入 activeId。

---

# 工作空间与远端同步

## 多工作空间隔离

- 每个工作空间用 UUID v4 作为 `workspaceId`，所有业务数据按 `lifeos-<workspaceId>-<collection>` 前缀写入 IndexedDB，跨空间天然隔离
- [services/workspaces.ts](services/workspaces.ts) 提供工作空间 CRUD（写入 `lifeos-meta-workspaces`），并维护 `localStorage['lifeos:active-workspace-id']`
- [stores/workspace.ts](stores/workspace.ts)（Pinia）协调切换：`switchTo(id)` 顺序为 `stopSync → closeWorkspaceDB → setActiveId → initDB → startSync`
- [app.vue](app.vue) 给 `<NuxtPage>` 绑定 `:key="workspaceStore.currentId"`，切换空间时强制重渲染，触发各 composable 的 `loadX()` 在新空间重新加载

## 远端 CouchDB 同步

- [services/sync.ts](services/sync.ts) 封装 PouchDB 原生 `db.sync(remote, { live: true, retry: true, batch_size: 500, batches_limit: 5 })`，按集合维度建立双向实时复制
- 远端数据库命名：`<remoteUrl>/<remotePrefix><collection>`（默认 `remotePrefix = 'lifeos-'`）
- 冲突策略沿用 PouchDB 默认的 last-write-wins，不做应用层合并
- `subscribeStatus(workspaceId, fn)` 暴露聚合状态（`disabled / idle / active / paused / error`）+ pendingPush/pendingPull 计数，供菜单栏徽章订阅
- 工作空间未配置 `remoteUrl` 时同步状态为 `disabled`，业务读写完全本地

---

# 调试规范

## 反复修复未果时的处理

如果同一问题经多次尝试仍未解决，应：

1. **增加调试信息**：在关键路径添加 `console.log` 或断点，输出中间状态、输入参数和返回值
2. **缩小范围**：通过注释或条件分支隔离可疑代码段，确认问题触发点
3. **测试确认**：在修复后编写最小复现步骤或临时测试用例，验证问题是否真正解决
4. **回退检查**：如果修改导致新问题，优先回退到上一个稳定状态，而非在错误基础上继续修补
