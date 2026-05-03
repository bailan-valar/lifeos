# Git 提交信息规范

## 格式

```
<type>: <subject>

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

## 示例

```
feat: 添加块编辑器的 todo 块类型

feat: 实现笔记树形结构与拖拽排序

fix: 修复 folderId 为 null 时的 RxDB 代理错误

refactor: 将块聚焦逻辑提取为 useBlockFocus composable

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

[plugins/pouchdb.client.ts](plugins/pouchdb.client.ts) 在首次加载时清理 `rxdb-dexie-*` / `lifeos-notes-*` 旧 IndexedDB 数据库，幂等性靠 `localStorage['lifeos:legacy-rxdb-cleared']` 控制。
