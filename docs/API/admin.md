# 管理员 API 文档

本文档描述了管理员专用的系统管理接口。

## 目录

- [通用说明](#通用说明)
  - [权限要求](#权限要求)
  - [响应格式](#响应格式)
- [用户管理](#用户管理)
  - [获取用户列表](#获取用户列表)
  - [获取用户详情](#获取用户详情)
  - [创建用户](#创建用户)
  - [更新用户](#更新用户)
  - [批量更新用户](#批量更新用户)
  - [重置用户密码](#重置用户密码)
- [统计数据](#统计数据)
  - [获取系统统计](#获取系统统计)

---

## 通用说明

### 权限要求

所有接口都需要管理员权限。

认证方式：

```
Authorization: Bearer <admin_token>
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

---

## 用户管理

### 获取用户列表

获取所有用户，支持筛选和搜索。

**请求**

```http
GET /api/__admin/users?page=1&limit=20&search=keyword&role=user
Authorization: Bearer <admin_token>
```

**查询参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |
| search | string | 否 | 搜索关键词（搜索邮箱和名称） |
| role | string | 否 | 角色筛选：admin \| user |

**响应**

```typescript
{
  success: true,
  data: {
    users: Array<{
      id: string,
      email: string,
      name: string | null,
      role: string,           // "user" | "admin"
      createdAt: string,
      _count: {
        feedbacks: number     // 该用户的反馈数量
      }
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

**排序规则**

- 按注册时间倒序

---

### 获取用户详情

获取指定用户的详细信息。

**请求**

```http
GET /api/__admin/users/{id}
Authorization: Bearer <admin_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 用户 ID |

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    email: string,
    name: string | null,
    role: string,
    createdAt: string
  }
}
```

---

### 创建用户

管理员创建新用户。

**请求**

```http
POST /api/__admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**

```typescript
{
  email: string,          // 必需，邮箱地址
  password: string,       // 必需，密码
  name?: string,          // 可选，用户名称
  role?: string           // 可选，角色，默认 "user"
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    email: string,
    name: string | null,
    role: string,
    createdAt: string
  }
}
```

**错误示例**

```json
{
  "statusCode": 409,
  "message": "邮箱已被使用"
}
```

---

### 更新用户

更新指定用户的信息。

**请求**

```http
PATCH /api/__admin/users/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 用户 ID |

**请求体**

所有字段都是可选的：

```typescript
{
  email?: string,
  name?: string,
  role?: string           // "user" | "admin"
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    email: string,
    name: string | null,
    role: string,
    createdAt: string,
    updatedAt: string
  }
}
```

---

### 批量更新用户

批量更新多个用户的角色。

**请求**

```http
PATCH /api/__admin/users/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**请求体**

```typescript
{
  userIds: string[],      // 必需，用户 ID 数组
  role: string            // 必需，目标角色："user" | "admin"
}
```

**请求体示例**

```json
{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "role": "admin"
}
```

**响应**

```typescript
{
  success: true,
  message: "已更新 3 个用户的角色"
}
```

---

### 重置用户密码

管理员重置指定用户的密码。

**请求**

```http
POST /api/__admin/users/{id}/password-reset
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 用户 ID |

**请求体**

```typescript
{
  newPassword: string     // 必需，新密码
}
```

**响应**

```typescript
{
  success: true,
  message: "密码已重置"
}
```

**注意事项**
- 新密码应该符合安全策略
- 建议通过安全渠道通知用户新密码

---

## 统计数据

### 获取系统统计

获取系统的综合统计数据。

**请求**

```http
GET /api/__admin/stats
Authorization: Bearer <admin_token>
```

**响应**

```typescript
{
  success: true,
  data: {
    // 用户统计
    totalUsers: number,          // 总用户数
    adminUsers: number,          // 管理员用户数
    newUsersToday: number,       // 今日新增用户
    activeUsers: number,         // 近30天活跃用户

    // 反馈统计
    totalFeedbacks: number,      // 总反馈数
    pendingFeedbacks: number,    // 待处理反馈数
    categoryStats: Array<{       // 按分类统计
      category: string,
      count: number
    }>,
    statusStats: Array<{         // 按状态统计
      status: string,
      count: number
    }>,

    // 最近数据
    recent: {
      users: Array<{             // 最近注册的用户（10个）
        id: string,
        email: string,
        name: string | null,
        role: string,
        createdAt: string
      }>,
      feedbacks: Array<{         // 最近的反馈（10个）
        id: string,
        content: string,
        category: string,
        status: string,
        createdAt: string,
        user: {
          id: string,
          email: string,
          name: string | null
        }
      }>
    }
  }
}
```

**统计说明**

- **活跃用户**：最近 30 天内有会话活动的用户
- **分类统计**：按 bug、feature、ui、performance、other 分类
- **状态统计**：按 pending、in_progress、resolved、closed 状态
- **最近数据**：各返回最近 10 条记录

---

## 数据模型

### User（用户）

```typescript
interface User {
  id: string              // UUID
  email: string           // 邮箱，唯一
  name: string | null     // 用户名称
  role: string            // 角色："user" | "admin"
  password: string        // 密码（bcrypt 哈希）
  createdAt: Date         // 注册时间
  updatedAt: Date         // 更新时间
}
```

---

## 枚举值

### 用户角色 (role)

| 值 | 说明 | 权限 |
|----|------|------|
| `user` | 普通用户 | 基础功能使用 |
| `admin` | 管理员 | 所有管理接口访问 |

---

## 注意事项

1. **权限验证**：所有接口都会验证管理员权限
2. **操作日志**：建议记录管理员操作的审计日志
3. **批量操作**：批量更新时注意操作影响范围
4. **密码安全**：重置密码后应通过安全渠道通知用户
