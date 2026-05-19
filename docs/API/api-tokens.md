# API Token 管理文档

本文档描述了 API Token 的管理接口，用于创建和管理长期访问凭证。

## 目录

- [概述](#概述)
- [通用说明](#通用说明)
  - [认证方式](#认证方式)
  - [Token 格式](#token-格式)
  - [响应格式](#响应格式)
- [接口列表](#接口列表)
  - [创建 API Token](#创建-api-token)
  - [获取 Token 列表](#获取-token-列表)
  - [删除 Token](#删除-token)

---

## 概述

API Token 是一种长期有效的访问凭证，适用于：

- 第三方应用集成
- 自动化脚本调用
- API 开发和测试
- 长期运行的客户端应用

**与 JWT Token 的区别：**

| 特性 | JWT Token | API Token |
|------|-----------|-----------|
| 获取方式 | 登录/注册 | 用户主动创建 |
| 有效期 | 7 天 | 可自定义或永久 |
| 用途 | 日常使用 | API 集成 |
| 显示次数 | 每次登录返回 | 仅创建时显示一次 |

---

## 通用说明

### 认证方式

所有接口都需要使用 JWT Token 进行认证（API Token 本身的管理仍需 JWT Token）：

```
Authorization: Bearer <jwt_token>
```

### Token 格式

API Token 格式：`lifeos_` 开头的随机字符串

```
lifeos_<base64url_random_32_bytes>
```

示例：`lifeos_abc123def456...`

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

## 接口列表

### 创建 API Token

创建一个新的 API Token。

**请求**

```http
POST /api/user/api-tokens
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**请求体**

```typescript
{
  name: string,           // 必需，Token 名称，1-50字符
  expiresAt?: string      // 可选，过期时间（ISO 8601 格式）
}
```

**请求体示例**

```json
{
  "name": "我的脚本",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**响应**

```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    token: string,           // ⚠️ 仅创建时显示完整 Token
    lastUsedAt: string | null,
    expiresAt: string | null,
    createdAt: string
  }
}
```

**注意事项**
- ⚠️ **Token 仅在创建时显示一次**，请妥善保存
- 每个用户最多可创建 10 个 API Token
- 不设置 `expiresAt` 则永久有效
- `name` 不能为空且不能超过 50 字符
- 过期时间必须在未来

**错误示例**

```json
{
  "statusCode": 400,
  "message": "最多只能创建 10 个 API Token"
}
```

---

### 获取 Token 列表

获取当前用户的所有 API Token。

**请求**

```http
GET /api/user/api-tokens
Authorization: Bearer <jwt_token>
```

**响应**

```typescript
{
  success: true,
  data: Array<{
    id: string,
    name: string,
    token: string,           // 脱敏显示：前8位 + 20个* + 后4位
    lastUsedAt: string | null,
    expiresAt: string | null,
    createdAt: string,
    isExpired: boolean       // 是否已过期
  }>
}
```

**注意事项**
- 返回的 Token 已脱敏，无法获取完整 Token
- `lastUsedAt` 为最后一次使用该 Token 的时间
- `isExpired` 标识 Token 是否已过期
- 按创建时间倒序排列

---

### 删除 Token

删除指定的 API Token。

**请求**

```http
DELETE /api/user/api-tokens/{id}
Authorization: Bearer <jwt_token>
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | Token ID |

**响应**

```typescript
{
  success: true,
  message: "删除成功"
}
```

**注意事项**
- 删除后该 Token 立即失效
- 操作不可逆

---

## 使用 API Token

创建 API Token 后，可以在任何需要认证的接口中使用：

```bash
curl -H "Authorization: Bearer lifeos_xxxxx" \
  https://your-domain.com/api/feedback
```

**使用示例**

```javascript
// Fetch API
fetch('https://your-domain.com/api/feedback', {
  headers: {
    'Authorization': 'Bearer lifeos_xxxxx'
  }
})

// Axios
axios.get('/api/feedback', {
  headers: {
    'Authorization': 'Bearer lifeos_xxxxx'
  }
})
```

---

## 数据模型

### ApiToken（API Token）

```typescript
interface ApiToken {
  id: string              // UUID
  userId: string          // 所属用户 ID
  name: string            // Token 名称
  token: string           // 完整 Token（仅创建时返回）
  lastUsedAt: Date | null // 最后使用时间
  expiresAt: Date | null  // 过期时间，null 表示永久
  createdAt: Date         // 创建时间
}
```

---

## 安全建议

1. **妥善保管**：API Token 仅在创建时显示一次，请立即保存到安全位置
2. **定期轮换**：建议定期删除旧 Token 并创建新 Token
3. **权限最小化**：仅为需要的应用创建 Token
4. **监控使用**：定期检查 `lastUsedAt`，删除不再使用的 Token
5. **设置过期**：为 Token 设置合理的过期时间，降低泄露风险
6. **不要泄露**：不要将 Token 硬编码在代码中或提交到版本控制
7. **使用环境变量**：在脚本中使用环境变量存储 Token
