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

# RxDB Schema 迁移规范

## 迁移策略键规则（重要）

RxDB 的 `migrationStrategies` 键是**目标版本号**，不是源版本号。

- Schema `version: N` 需要策略键 `1, 2, ..., N`
- 策略 `1` = 将数据从版本 0 迁移到版本 1
- 策略 `N` = 将数据从版本 N-1 迁移到版本 N

**常见错误**：

```ts
// 错误：以为键是 0..version-1
migrationStrategies: {
  0: (doc) => doc,  // ❌ 不需要
  1: (doc) => doc,
  ...
  12: (doc) => doc   // ❌ 漏了 13
}

// 正确：schema version 13 需要键 1..13
migrationStrategies: {
  1: (doc) => doc,
  2: (doc) => doc,
  ...
  12: (doc) => doc,
  13: (doc) => doc   // ✓ 新增策略对应新版本
}
```

## 升级 Schema 时的检查清单

1. 修改 `SCHEMA_VERSION` 常量（所有 collection 共用）
2. 为**每个 collection** 添加新的迁移策略键（值为 `(doc) => doc` 或实际迁移逻辑）
3. **不需要**在 schema 定义中手动添加 RxDB 内部字段（`_deleted`、`_rev`、`_meta`、`_attachments`），RxDB 会自动注入这些字段，手动添加反而会导致 hash 不匹配
4. 如果仅修改了 schema 结构（如添加字段、调整 indexes）但数据格式兼容，使用 `(doc) => doc` 即可

## 错误码速查

| 错误码 | 含义 | 常见原因 |
|--------|------|----------|
| `DB6` | Schema hash 不匹配 | 修改了 schema 但未升级 version，或手动添加了 RxDB 内部字段 |
| `COL12` | 迁移策略数量不对 | 策略键范围错误（如少了最后一个或多了 0） |
| `COL13` | 迁移策略不是函数 | 策略值为 `undefined`（通常是键范围错误导致 RxDB 查不到对应策略） |
