# 认证系统 API 文档

本文档描述了用户认证相关的 API 接口。

## 目录

- [通用说明](#通用说明)
  - [认证方式](#认证方式)
  - [响应格式](#响应格式)
  - [状态码](#状态码)
- [接口列表](#接口列表)
  - [用户注册](#用户注册)
  - [用户登录](#用户登录)
  - [获取当前用户信息](#获取当前用户信息)
  - [刷新 Token](#刷新-token)

---

## 通用说明

### 认证方式

除了注册和登录接口外，其他接口都需要在请求头中携带 Bearer Token：

```
Authorization: Bearer <token>
```

### 响应格式

成功响应：

```typescript
{
  user: {
    id: string,
    email: string,
    name: string | null,
    role: string
  },
  token?: string
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
| 409 | 资源冲突（如邮箱已存在） |

---

## 接口列表

### 用户注册

创建一个新用户账号。

**请求**

```http
POST /api/auth/signup
Content-Type: application/json
```

**请求体**

```typescript
{
  email: string,     // 必需，邮箱地址
  password: string,  // 必需，密码
  name?: string      // 可选，用户名称
}
```

**响应**

```typescript
{
  user: {
    id: string,              // UUID
    email: string,
    name: string | null,
    role: string             // "user" | "admin"
  },
  token: string              // JWT Token，有效期 7 天
}
```

**错误示例**

```json
{
  "statusCode": 409,
  "message": "User already exists"
}
```

**注意事项**
- 邮箱必须是唯一的
- 密码会被 bcrypt 哈希存储
- 注册成功后自动获得 JWT Token

---

### 用户登录

使用邮箱和密码登录。

**请求**

```http
POST /api/auth/login
Content-Type: application/json
```

**请求体**

```typescript
{
  email: string,     // 必需，邮箱地址
  password: string   // 必需，密码
}
```

**响应**

```typescript
{
  user: {
    id: string,
    email: string,
    name: string | null,
    role: string
  },
  token: string      // JWT Token，有效期 7 天
}
```

**错误示例**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**注意事项**
- 邮箱或密码错误时返回 401，不区分具体错误
- Token 有效期为 7 天
- 建议客户端在本地安全存储 Token

---

### 获取当前用户信息

获取当前登录用户的信息。

**请求**

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**响应**

```typescript
{
  id: string,
  email: string,
  name: string | null,
  role: string        // "user" | "admin"
}
```

**错误示例**

```json
{
  "statusCode": 401,
  "message": "登录已过期，请重新登录"
}
```

**注意事项**
- 需要有效的 JWT Token 或 API Token
- Token 过期时需要重新登录

---

### 刷新 Token

刷新当前 Token，延长有效期。

**请求**

```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

**响应**

```typescript
{
  token: string      // 新的 JWT Token
}
```

**错误示例**

```json
{
  "statusCode": 401,
  "message": "Invalid token"
}
```

**注意事项**
- 刷新后旧 Token 失效
- 新 Token 有效期重新计算为 7 天

---

## 数据模型

### User（用户）

```typescript
interface User {
  id: string              // UUID
  email: string           // 邮箱，唯一
  name: string | null     // 用户名称
  role: string            // 角色："user" | "admin"
  createdAt: Date         // 注册时间
}
```

---

## 权限说明

| 角色 | 权限 |
|------|------|
| `user` | 普通用户，可创建反馈、查看自己的数据 |
| `admin` | 管理员，可访问所有管理接口、查看所有用户数据 |

---

## 安全注意事项

1. **密码安全**：密码使用 bcrypt 哈希，成本因子为 10
2. **Token 存储**：客户端应使用 HttpOnly Cookie 或安全存储方式保存 Token
3. **HTTPS**：生产环境必须使用 HTTPS 传输敏感数据
4. **Token 过期**：JWT Token 有效期 7 天，过期后需重新登录
