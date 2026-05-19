# LifeOS API 文档

欢迎使用 LifeOS API 文档。本文档描述了 LifeOS 系统的所有 API 接口。

## 快速开始

### 基础 URL

```
https://your-domain.com/api
```

### 认证方式

LifeOS API 支持两种认证方式：

| 方式 | 获取途径 | 有效期 | 适用场景 |
|------|----------|--------|----------|
| JWT Token | 登录/注册接口 | 7 天 | 日常使用 |
| API Token | 设置页面创建 | 可自定义 | API 集成 |

所有需要在请求头中携带：

```
Authorization: Bearer <token>
```

### 响应格式

**成功响应：**

```typescript
{
  success: true,
  data?: any,
  message?: string
}
```

**错误响应：**

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
| 409 | 资源冲突 |
| 500 | 服务器错误 |

---

## API 模块

### 认证系统

用户注册、登录、身份验证等基础认证功能。

[查看详细文档 →](./auth.md)

**主要接口：**
- `POST /api/auth/signup` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/refresh` - 刷新 Token

---

### API Token 管理

创建和管理长期有效的 API 访问凭证。

[查看详细文档 →](./api-tokens.md)

**主要接口：**
- `POST /api/user/api-tokens` - 创建 API Token
- `GET /api/user/api-tokens` - 获取 Token 列表
- `DELETE /api/user/api-tokens/{id}` - 删除 Token

---

### 反馈系统

用户反馈提交、回复、管理等功能。

[查看详细文档 →](./feedback.md)

**用户端接口：**
- `POST /api/feedback` - 创建反馈
- `GET /api/feedback` - 获取我的反馈列表
- `DELETE /api/feedback/{id}` - 删除反馈
- `GET /api/feedbacks/{id}/replies` - 获取回复列表
- `POST /api/feedbacks/{id}/replies` - 提交回复

**管理员端接口：**
- `GET /api/__admin/feedbacks` - 获取所有反馈
- `GET /api/__admin/feedbacks/{id}` - 获取反馈详情
- `PATCH /api/__admin/feedbacks/{id}` - 更新反馈状态
- `DELETE /api/__admin/feedbacks/{id}` - 删除反馈
- `POST /api/__admin/feedbacks/{id}/replies` - 管理员回复
- `PATCH /api/__admin/feedbacks/replies/{replyId}` - 编辑回复
- `DELETE /api/__admin/feedbacks/replies/{replyId}` - 删除回复

---

### 版本日志 (Changelog)

产品版本更新历史的查询和管理。

[查看详细文档 →](./changelog.md)

**用户端接口：**
- `GET /api/changelog` - 获取版本日志列表
- `GET /api/changelog/latest` - 获取最新版本

**管理员端接口：**
- `POST /api/__admin/changelog` - 创建版本日志
- `PATCH /api/__admin/changelog/{id}` - 更新版本日志
- `DELETE /api/__admin/changelog/{id}` - 删除版本日志

---

### 管理员接口

系统管理、用户管理、统计数据等管理员专用功能。

[查看详细文档 →](./admin.md)

**用户管理：**
- `GET /api/__admin/users` - 获取用户列表
- `GET /api/__admin/users/{id}` - 获取用户详情
- `POST /api/__admin/users` - 创建用户
- `PATCH /api/__admin/users/{id}` - 更新用户
- `PATCH /api/__admin/users/bulk` - 批量更新用户角色
- `POST /api/__admin/users/{id}/password-reset` - 重置用户密码

**统计数据：**
- `GET /api/__admin/stats` - 获取系统统计数据

---

## 快速示例

### 用户注册

```bash
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "张三"
  }'
```

### 用户登录

```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 提交反馈

```bash
curl -X POST https://your-domain.com/api/feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "建议增加暗黑模式",
    "category": "feature",
    "rating": 5
  }'
```

### 创建 API Token

```bash
curl -X POST https://your-domain.com/api/user/api-tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的脚本",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

---

## 常见问题

### Q: Token 过期了怎么办？

A: JWT Token 有效期为 7 天，过期后需要重新登录获取新的 Token。API Token 的有效期由创建时决定，可以在创建时指定过期时间。

### Q: 如何获取管理员权限？

A: 管理员账号需要由现有管理员通过管理员接口创建，或直接在数据库中设置 `role` 字段为 `admin`。

### Q: API 有速率限制吗？

A: 当前版本没有实现速率限制，建议在反向代理层（如 Nginx）配置。

### Q: 支持 CORS 跨域请求吗？

A: 是的，API 支持 CORS，可以从浏览器直接调用。

---

## 技术支持

如有问题或建议，请通过以下方式联系：

- 提交反馈：在应用内使用反馈功能
- 邮箱：support@example.com

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-15 | 初始版本 |
