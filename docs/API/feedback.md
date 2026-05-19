# 反馈系统 API 文档

本文档描述了反馈系统的所有 API 接口，包括用户端和管理员端。

## 目录

- [通用说明](#通用说明)
  - [认证方式](#认证方式)
  - [获取 Token](#获取-token)
  - [响应格式](#响应格式)
  - [状态码](#状态码)
- [用户端接口](#用户端接口)
  - [创建反馈](#创建反馈)
  - [获取反馈列表](#获取反馈列表)
  - [删除反馈](#删除反馈)
  - [获取回复列表](#获取回复列表)
  - [提交回复](#提交回复)
- [管理员端接口](#管理员端接口)
  - [获取反馈列表（管理员）](#获取反馈列表管理员)
  - [获取反馈详情](#获取反馈详情)
  - [更新反馈](#更新反馈)
  - [删除反馈（管理员）](#删除反馈管理员)
  - [获取回复列表（管理员）](#获取回复列表管理员)
  - [提交回复（管理员）](#提交回复管理员)
  - [更新回复](#更新回复)
  - [删除回复](#删除回复)

---

## 通用说明

### 认证方式

所有接口都需要在请求头中携带 Bearer Token：

```
Authorization: Bearer <token>
```

支持两种 Token：

| Token 类型 | 获取方式 | 有效期 | 用途 |
|-----------|---------|--------|------|
| JWT Token | 登录/注册接口返回 | 7 天 | 日常使用 |
| API Token | 设置页面创建 | 可自定义 | API 调用 |

### 获取 Token

#### 1. JWT Token（临时使用）

通过登录或注册获取：

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "user": { "id": "...", "email": "user@example.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. API Token（长期使用）

在设置页面创建，适用于脚本、第三方应用集成：

1. 登录后访问 **设置 → API**
2. 点击「新建 Token」
3. 输入名称和过期时间
4. 复制生成的 Token（仅显示一次）

**Token 格式：** `lifeos_` 开头的随机字符串

**使用示例：**
```bash
curl -H "Authorization: Bearer lifeos_xxxxx" \
  https://your-domain.com/api/feedback
```

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

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限 |
| 404 | 资源不存在 |

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

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限 |
| 404 | 资源不存在 |

---

## 用户端接口

### 创建反馈

创建一条新的用户反馈。

**请求**

```http
POST /api/feedback
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```typescript
{
  content: string,      // 必需，反馈内容，1-2000字符
  category?: string,    // 可选，分类：bug | feature | ui | performance | other，默认 other
  rating?: number       // 可选，评分 1-5
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    category: string,
    rating: number | null,
    createdAt: string  // ISO 8601 格式
  }
}
```

**错误示例**

```json
{
  "statusCode": 400,
  "message": "反馈内容不能超过 2000 字符"
}
```

---

### 获取反馈列表

获取当前用户的反馈列表。

**请求**

```http
GET /api/feedback
Authorization: Bearer <token>
```

**响应**

```typescript
{
  success: true,
  data: Array<{
    id: string,
    content: string,
    category: string,
    rating: number | null,
    status: string,          // pending | in_progress | resolved | closed
    reply: string | null,    // 管理员回复（旧版本）
    repliedAt: string | null,
    createdAt: string
  }>
}
```

**说明**
- 最多返回 20 条记录
- 按创建时间倒序排列

---

### 删除反馈

删除指定反馈。

**请求**

```http
DELETE /api/feedback/{id}
Authorization: Bearer <token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**响应**

```typescript
{
  success: true,
  message: "删除成功"
}
```

**错误示例**

```json
{
  "statusCode": 404,
  "message": "反馈不存在或无权删除"
}
```

---

### 获取回复列表

获取指定反馈的所有回复（对话模式）。

**请求**

```http
GET /api/feedbacks/{id}/replies
Authorization: Bearer <token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**响应**

```typescript
{
  success: true,
  data: Array<{
    id: string,
    content: string,
    isAdmin: boolean,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null
    }
  }>
}
```

**说明**
- 只能查看自己的反馈回复
- 按创建时间升序排列

---

### 提交回复

向指定反馈提交回复（对话模式）。

**请求**

```http
POST /api/feedbacks/{id}/replies
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**请求体**

```typescript
{
  content: string  // 必需，回复内容，1-2000字符
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    isAdmin: false,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null
    }
  }
}
```

**错误示例**

```json
{
  "statusCode": 403,
  "message": "无权访问此反馈"
}
```

---

## 管理员端接口

> 所有管理员接口需要管理员权限

### 获取反馈列表（管理员）

获取所有反馈，支持筛选和搜索。

**请求**

```http
GET /api/__admin/feedbacks?page=1&limit=20&status=pending&category=bug&search=keyword
Authorization: Bearer <admin_token>
```

**查询参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |
| status | string | 否 | 状态筛选：pending | in_progress | resolved | closed |
| category | string | 否 | 分类筛选：bug | feature | ui | performance | other |
| search | string | 否 | 搜索关键词（搜索内容和用户邮箱） |

**响应**

```typescript
{
  success: true,
  data: {
    feedbacks: Array<{
      id: string,
      content: string,
      category: string,
      rating: number | null,
      status: string,
      reply: string | null,        // 旧版本管理员回复
      repliedAt: string | null,
      createdAt: string,
      updatedAt: string,
      user: {
        id: string,
        email: string,
        name: string | null
      },
      repliers: Array<{
        id: string,
        email: string,
        name: string | null
      }>,
      adminReply: string | null,   // 旧版本管理员回复（映射）
      replier: object | null       // 第一个回复者（映射）
    }>,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

---

### 获取反馈详情

获取指定反馈的完整信息，包括所有回复。

**请求**

```http
GET /api/__admin/feedbacks/{id}
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    category: string,
    rating: number | null,
    status: string,
    reply: string | null,
    repliedAt: string | null,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null,
      createdAt: string
    },
    replies: Array<{
      id: string,
      content: string,
      isAdmin: boolean,
      createdAt: string,
      updatedAt: string,
      user: {
        id: string,
        email: string,
        name: string | null
      }
    }>
  }
}
```

---

### 更新反馈

更新反馈状态或管理员回复。

**请求**

```http
PATCH /api/__admin/feedbacks/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**请求体**

```typescript
{
  status?: string,      // 状态：pending | in_progress | resolved | closed
  adminReply?: string   // 管理员回复，1-2000字符（旧版本，建议使用回复接口）
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    category: string,
    status: string,
    reply: string | null,      // 更新后的管理员回复
    repliedAt: string | null,  // 回复时间
    // ... 其他字段
  }
}
```

---

### 删除反馈（管理员）

删除指定的反馈。

**请求**

```http
DELETE /api/__admin/feedbacks/{id}
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**响应**

```typescript
{
  success: true,
  message: "反馈已删除"
}
```

---

### 获取回复列表（管理员）

获取指定反馈的所有回复。

**请求**

```http
GET /api/__admin/feedbacks/{id}/replies
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**响应**

```typescript
{
  success: true,
  data: Array<{
    id: string,
    content: string,
    isAdmin: boolean,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null
    }
  }>
}
```

---

### 提交回复（管理员）

管理员向指定反馈提交回复。

**请求**

```http
POST /api/__admin/feedbacks/{id}/replies
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 反馈 ID |

**请求体**

```typescript
{
  content: string  // 必需，回复内容，1-2000字符
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    isAdmin: true,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null
    }
  }
}
```

---

### 更新回复

管理员编辑已存在的回复。

**请求**

```http
PATCH /api/__admin/feedbacks/replies/{replyId}
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| replyId | string | 回复 ID |

**请求体**

```typescript
{
  content: string  // 必需，新的回复内容，1-2000字符
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,      // 更新后的内容
    isAdmin: boolean,
    createdAt: string,
    updatedAt: string,
    user: {
      id: string,
      email: string,
      name: string | null
    }
  }
}
```

---

### 删除回复

管理员删除指定的回复。

**请求**

```http
DELETE /api/__admin/feedbacks/replies/{replyId}
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| replyId | string | 回复 ID |

**响应**

```typescript
{
  success: true,
  message: "回复已删除"
}
```

---

## 数据模型

### Feedback（反馈）

```typescript
interface Feedback {
  id: string              // UUID
  userId: string          // 用户 ID
  content: string         // 反馈内容，1-2000字符
  category: string        // 分类：bug | feature | ui | performance | other
  rating: number | null   // 评分，1-5
  status: string          // 状态：pending | in_progress | resolved | closed
  reply: string | null    // 管理员回复（旧版本）
  repliedAt: Date | null  // 回复时间
  createdAt: Date         // 创建时间
  updatedAt: Date         // 更新时间
}
```

### FeedbackReply（回复）

```typescript
interface FeedbackReply {
  id: string            // UUID
  feedbackId: string    // 关联的反馈 ID
  userId: string        // 回复者 ID
  content: string       // 回复内容，1-2000字符
  isAdmin: boolean      // 是否为管理员回复
  createdAt: Date       // 创建时间
  updatedAt: Date       // 更新时间
}
```

### 用户信息

```typescript
interface User {
  id: string            // UUID
  email: string         // 邮箱
  name: string | null   // 名称
  createdAt?: Date      // 注册时间（详情接口）
}
```

---

## 枚举值

### 反馈分类 (category)

| 值 | 说明 |
|----|------|
| bug | Bug 反馈 |
| feature | 功能建议 |
| ui | UI/UX 问题 |
| performance | 性能问题 |
| other | 其他 |

### 反馈状态 (status)

| 值 | 说明 |
|----|------|
| pending | 待处理 |
| in_progress | 处理中 |
| resolved | 已解决 |
| closed | 已关闭 |

---

## 注意事项

1. **内容长度限制**：所有文本字段（content、adminReply）最大长度为 2000 字符
2. **评分范围**：rating 必须是 1-5 之间的整数
3. **权限验证**：用户端接口会验证反馈所有权，管理员端需要管理员权限
4. **对话模式**：建议使用 `FeedbackReply` 实现多轮对话，而非旧的 `reply` 字段
5. **通知邮件**：TODO - 创建回复时未发送通知邮件，需要时集成邮件服务
