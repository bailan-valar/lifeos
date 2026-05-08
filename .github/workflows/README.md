# GitHub Actions 部署配置

## 配置 Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 secrets：

### SSH 连接相关
| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `REMOTE_HOST` | 服务器 IP 地址 | `1.2.3.4` |
| `REMOTE_USER` | SSH 用户名 | `root` 或 `ubuntu` |
| `REMOTE_TARGET_PATH` | 部署目标路径 | `/root/lifeos` |

### 应用环境变量
| Secret 名称 | 说明 |
|------------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 |
| `JWT_SECRET` | JWT 签名密钥（建议随机生成） |
| `NUXT_PUBLIC_API_BASE` | API 基础路径，默认 `/api` |
| `NUXT_PUBLIC_COUCHDB_URL` | CouchDB 远端同步地址 |
| `NUXT_PUBLIC_COUCHDB_USERNAME` | CouchDB 用户名 |
| `NUXT_PUBLIC_COUCHDB_PASSWORD` | CouchDB 密码 |
| `NUXT_PUBLIC_COUCHDB_PREFIX` | CouchDB 数据库前缀，默认 `lifeos-` |

## 服务器端准备

### 1. 安装依赖

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 nginx（可选，用于反向代理）
sudo apt-get install -y nginx
```

### 2. 配置 SSH 公钥

在服务器上生成 SSH 密钥对（如果已有可跳过）：

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

将公钥添加到 `~/.ssh/authorized_keys`：
```bash
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

私钥内容（`~/.ssh/id_rsa`）配置到 GitHub Secret `SSH_PRIVATE_KEY`。

### 3. 配置 Nginx（推荐）

创建 `/etc/nginx/sites-available/lifeos`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/lifeos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置防火墙（如有）

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 部署流程

1. 推送代码到 `main` 分支触发部署
2. 或在 GitHub Actions 页面手动触发 `workflow_dispatch`
3. 等待部署完成，查看 Actions 日志

## 常见问题

### PM2 进程管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs lifeos-3000

# 重启服务
pm2 restart lifeos-3000

# 停止服务
pm2 stop lifeos-3000

# 删除服务
pm2 delete lifeos-3000
```

### 本地开发 vs 生产

| | 本地开发 | 生产环境 |
|---|---|---|
| 命令 | `nuxt dev` | `node .output/server/index.mjs` |
| 配置 | `ecosystem.config.cjs` | `ecosystem.production.cjs` |
| 端口 | 3434 | 3000 |
| PM2 名称 | `lifeos-3434` | `lifeos-3000` |
