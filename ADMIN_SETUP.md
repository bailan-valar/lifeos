# LifeOS 管理员后台系统 - 使用说明

## 功能概述

✅ **已完成功能：**
- 完整的管理员后台系统
- 用户管理（查看、编辑、重置密码）
- 反馈管理（查看、状态管理、回复、删除）
- 统计仪表盘
- 权限保护机制

---

## 📋 部署步骤

### 第一步：执行数据库迁移

在项目根目录执行以下命令：

```bash
npx prisma migrate dev --name add_admin_role_and_feedback_status
```

这将会：
- 在 `User` 表添加 `role` 字段（默认值：'user'）
- 在 `Feedback` 表添加 `status`、`adminReply`、`repliedAt`、`repliedBy` 字段
- 创建必要的索引

### 第二步：初始化管理员账户

选择一个现有用户设置为管理员：

```bash
npx tsx server/scripts/init-admin.ts user@example.com
```

或者直接在数据库中手动更新：

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'user@example.com';
```

### 第三步：启动应用

```bash
npm run dev
```

---

## 🔐 访问管理后台

### 方式一：通过设置页面（推荐）

1. 使用管理员账户登录
2. 进入"设置"页面
3. 在左侧导航底部会显示"管理后台"入口
4. 点击即可进入

### 方式二：直接访问 URL

在浏览器中直接访问：
```
http://localhost:3000/__admin
```

---

## 📊 功能说明

### 仪表盘 (`/__admin`)

显示系统统计数据：
- 总用户数和今日新增用户
- 总反馈数和待处理反馈数
- 反馈分类统计
- 最近反馈列表

### 用户管理 (`/__admin/users`)

**功能：**
- 📋 查看用户列表（支持分页）
- 🔍 搜索用户（按邮箱或姓名）
- 🏷️ 按角色筛选（管理员/普通用户）
- ✏️ 编辑用户信息（姓名、邮箱、角色）
- 🔑 重置用户密码（生成12位随机密码）
- 👁️ 查看用户详情

**注意事项：**
- 管理员不能修改自己的角色
- 重置密码后新密码会显示在界面上（建议通过邮件发送）

### 反馈管理 (`/__admin/feedbacks`)

**功能：**
- 📋 查看所有反馈列表（支持分页）
- 🔍 搜索反馈（按内容或用户邮箱）
- 🏷️ 按状态筛选（待处理、处理中、已解决、已关闭）
- 📂 按分类筛选（Bug、功能建议、界面优化、性能问题、其他）
- ✏️ 更新反馈状态
- 💬 添加/编辑管理员回复
- 🗑️ 删除反馈

**反馈状态说明：**
- `pending` - 待处理（新反馈默认状态）
- `in_progress` - 处理中
- `resolved` - 已解决
- `closed` - 已关闭

---

## 🔐 权限系统

### 角色类型

- `user` - 普通用户（默认）
- `admin` - 管理员

### 权限说明

**普通用户：**
- ✅ 可以访问所有常规功能
- ❌ 无法访问管理后台
- ❌ 无法调用管理员 API

**管理员：**
- ✅ 可以访问所有常规功能
- ✅ 可以访问管理后台
- ✅ 可以调用所有管理员 API
- ✅ 在设置页面显示"管理后台"入口

### 权限验证机制

**服务端验证：**
- 所有 `/api/__admin/*` 路由都需要管理员权限
- 通过 `server/middleware/admin.ts` 中间件验证
- 非管理员访问返回 403 错误

**前端验证：**
- 所有 `/__admin/*` 页面都需要管理员权限
- 通过 `middleware/admin.ts` 中间件验证
- 非管理员自动跳转到登录页

---

## 📁 文件结构

```
life-os/
├── prisma/
│   └── schema.prisma                 # 数据库模型（已更新）
├── server/
│   ├── api/__admin/                  # 管理员 API
│   │   ├── users/                    # 用户管理 API
│   │   ├── feedbacks/                # 反馈管理 API
│   │   └── stats.get.ts              # 统计数据 API
│   ├── middleware/
│   │   └── admin.ts                  # 服务端权限中间件
│   ├── scripts/
│   │   └── init-admin.ts             # 初始化管理员脚本
│   └── utils/
│       └── auth.ts                   # 认证工具（已更新）
├── pages/__admin/                    # 管理后台页面
│   ├── index.vue                     # 仪表盘
│   ├── users/
│   │   ├── index.vue                 # 用户列表
│   │   └── [id].vue                  # 用户详情（可选）
│   └── feedbacks/
│       ├── index.vue                 # 反馈列表
│       └── [id].vue                  # 反馈详情（可选）
├── components/admin/                 # 管理后台组件
│   ├── AdminLayout.vue               # 管理后台布局
│   ├── UserEditDialog.vue            # 用户编辑弹窗
│   └── FeedbackDetailDialog.vue      # 反馈详情弹窗
├── middleware/
│   └── admin.ts                      # 前端路由中间件
└── components/settings/
    └── SettingsLayout.vue            # 设置布局（已更新，添加管理员入口）
```

---

## 🎨 UI 设计

管理后台采用 **Liquid Glass 26 iOS** 设计风格：
- 🌈 玻璃拟态效果（blur + 半透明）
- 📱 响应式设计，支持移动端
- 🎨 使用现有设计系统的颜色和组件
- ✨ 流畅的动画和过渡效果

---

## 🔧 API 端点清单

### 用户管理
- `GET /api/__admin/users` - 获取用户列表
- `GET /api/__admin/users/:id` - 获取用户详情
- `PATCH /api/__admin/users/:id` - 更新用户信息
- `POST /api/__admin/users/:id/password-reset` - 重置用户密码

### 反馈管理
- `GET /api/__admin/feedbacks` - 获取反馈列表
- `GET /api/__admin/feedbacks/:id` - 获取反馈详情
- `PATCH /api/__admin/feedbacks/:id` - 更新反馈状态和回复
- `DELETE /api/__admin/feedbacks/:id` - 删除反馈

### 统计数据
- `GET /api/__admin/stats` - 获取统计数据

---

## ⚠️ 安全注意事项

1. **JWT_SECRET** - 确保设置了强密码作为 JWT 密钥
2. **管理员权限** - 谨慎分配管理员权限
3. **密码重置** - 建议集成邮件服务，避免在界面上直接显示新密码
4. **操作日志** - 建议在未来添加管理员操作日志功能
5. **HTTPS** - 生产环境必须使用 HTTPS

---

## 🚀 后续扩展建议

### 短期扩展
- [ ] 集成邮件服务（密码重置和反馈回复通知）
- [ ] 添加批量操作功能
- [ ] 添加数据导出功能

### 长期扩展
- [ ] 实现操作日志记录
- [ ] 添加更多统计图表和趋势分析
- [ ] 实现更细粒度的权限控制
- [ ] 添加系统监控和性能分析

---

## 🐛 故障排查

### 问题：无法访问管理后台

**可能原因：**
1. 用户不是管理员角色
2. 未登录或 Token 过期
3. 数据库迁移未执行

**解决方案：**
```bash
# 1. 检查用户角色
npx prisma studio

# 2. 重新设置管理员
npx tsx server/scripts/init-admin.ts user@example.com

# 3. 重新执行迁移
npx prisma migrate dev --name add_admin_role_and_feedback_status
```

### 问题：API 返回 403 错误

**可能原因：**
- Token 中未包含角色信息（需要重新登录）
- 用户角色不是 'admin'

**解决方案：**
1. 退出登录后重新登录
2. 检查数据库中用户角色是否正确

---

## 📞 技术支持

如有问题，请联系开发团队或查看项目文档。

---

**文档版本：** 1.0.0
**最后更新：** 2025-01-18
**维护者：** LifeOS 开发团队
