# Changelog API 文档

本文档描述了版本日志（Changelog）相关的 API 接口。

## 目录

- [概述](#概述)
- [通用说明](#通用说明)
  - [认证要求](#认证要求)
  - [响应格式](#响应格式)
- [用户端接口](#用户端接口)
  - [获取 Changelog 列表](#获取-changelog-列表)
  - [获取最新版本](#获取最新版本)
- [管理员端接口](#管理员端接口)
  - [创建 Changelog](#创建-changelog)
  - [更新 Changelog](#更新-changelog)
  - [删除 Changelog](#删除-changelog)
- [数据模型](#数据模型)

---

## 概述

Changelog 系统用于记录和展示产品的版本更新历史。

**访问权限：**
- 普通用户：只读访问
- 管理员：完全访问

---

## 通用说明

### 认证要求

| 接口类型 | 认证要求 |
|----------|----------|
| 用户端接口 | 可选（未登录也可访问） |
| 管理员端接口 | 必需（需要管理员权限） |

### 响应格式

成功响应：

```typescript
{
  success: true,
  data?: any,
  message?: string
}
```

错误响应：

```typescript
{
  statusCode: number,
  message: string
}
```

---

## 用户端接口

### 获取 Changelog 列表

获取所有版本的更新日志。

**请求**

```http
GET /api/changelog
```

**认证**

可选。可以在请求头中携带 Token：

```
Authorization: Bearer <token>
```

**响应**

```typescript
{
  success: true,
  data: Array<{
    id: string,
    version: string,        // 版本号，如 "1.0.0"
    type: string,           // 类型：feature | fix | improvement | breaking
    title: string,          // 标题
    description: string,    // 详细描述
    releaseDate: string,    // 发布日期（ISO 8601）
    createdAt: string,      // 创建时间
    updatedAt: string       // 更新时间
  }>
}
```

**排序规则**

- 按发布日期倒序
- 发布日期相同则按创建时间倒序

---

### 获取最新版本

获取最新的版本日志。

**请求**

```http
GET /api/changelog/latest
```

**认证**

可选。

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    version: string,
    type: string,
    title: string,
    description: string,
    releaseDate: string,
    createdAt: string,
    updatedAt: string
  } | null    // 如果没有日志则返回 null
}
```

---

## 管理员端接口

> 所有管理员接口需要管理员权限

### 创建 Changelog

创建一个新的版本日志。

**请求**

```http
POST /api/__admin/changelog
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**

```typescript
{
  version: string,         // 必需，版本号，如 "1.0.0"
  type: string,            // 必需，类型
  title: string,           // 必需，标题
  description?: string,    // 可选，详细描述
  releaseDate: string      // 必需，发布日期（ISO 8601）
}
```

**请求体示例**

```json
{
  "version": "1.2.0",
  "type": "feature",
  "title": "新增暗黑模式",
  "description": "新增系统级暗黑模式支持，可在设置中切换",
  "releaseDate": "2024-01-15T00:00:00Z"
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    version: string,
    type: string,
    title: string,
    description: string,
    releaseDate: string,
    createdAt: string,
    updatedAt: string
  }
}
```

---

### 更新 Changelog

更新现有的版本日志。

**请求**

```http
PATCH /api/__admin/changelog/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | Changelog ID |

**请求体**

所有字段都是可选的：

```typescript
{
  version?: string,
  type?: string,
  title?: string,
  description?: string,
  releaseDate?: string
}
```

**请求体示例**

```json
{
  "title": "更新后的标题",
  "description": "更新后的描述"
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    version: string,
    type: string,
    title: string,
    description: string,
    releaseDate: string,
    createdAt: string,
    updatedAt: string
  }
}
```

---

### 删除 Changelog

删除指定的版本日志。

**请求**

```http
DELETE /api/__admin/changelog/{id}
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | Changelog ID |

**响应**

```typescript
{
  success: true,
  message: "删除成功"
}
```

---

## 数据模型

### Changelog（版本日志）

```typescript
interface Changelog {
  id: string              // UUID
  version: string         // 版本号，如 "1.0.0"
  type: string            // 更新类型
  title: string           // 标题
  description: string     // 详细描述
  releaseDate: Date       // 发布日期
  createdAt: Date         // 创建时间
  updatedAt: Date         // 更新时间
}
```

---

## 枚举值

### 更新类型 (type)

| 值 | 说明 | 建议图标 |
|----|------|----------|
| `feature` | 新功能 | ✨ |
| `fix` | 问题修复 | 🐛 |
| `improvement` | 改进优化 | ♻️ |
| `breaking` | 重大变更 | ⚠️ |

---

## 版本号规范

建议遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

```
主版本号.次版本号.修订号

1.2.3
│ │ │
│ │ └── 修订号：bug 修复
│ └──── 次版本号：新功能，向后兼容
└────── 主版本号：重大变更，可能不兼容
```

**示例：**

- `1.0.0` → `1.0.1`：修复 bug
- `1.0.1` → `1.1.0`：新增功能
- `1.1.0` → `2.0.0`：重大变更

---

## 注意事项

1. **日期格式**：所有日期字段使用 ISO 8601 格式
2. **版本号唯一**：建议不要创建重复的版本号
3. **描述长度**：description 字段建议控制在 500 字符以内
4. **发布日期**：可以设置未来日期，实现定时发布
