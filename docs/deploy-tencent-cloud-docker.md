# Docker 部署（腾讯云）

本项目是 **Next.js 全栈单体应用**：页面与 `/api/*` 在同一容器内，无需分开部署前后端。

## 架构

```
Internet ──► Nginx (443) ──► worship-songs 容器 :3000
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              TencentDB         uploads 卷      SMTP / AI API
              PostgreSQL      (歌谱/音频)
```

| 组件 | 推荐 |
|------|------|
| 应用 | 本仓库 Docker 镜像 |
| 数据库 | [TencentDB for PostgreSQL](https://cloud.tencent.com/product/postgres) |
| 服务器 | 轻量应用服务器 / CVM（2核4G 起） |
| 镜像仓库 | [TCR 容器镜像服务](https://cloud.tencent.com/product/tcr)（可选） |
| 文件 | Docker volume 挂载 `public/uploads`（后续可迁 COS） |

## 1. 准备环境变量

```bash
cp .env.production.example .env
```

编辑 `.env`，至少配置：

```env
DATABASE_URL="postgresql://USER:PASS@腾讯云内网或外网地址:5432/worship_songs?sslmode=require"
NEXTAUTH_URL="https://你的域名"
NEXTAUTH_SECRET="用 openssl rand -base64 32 生成"
NEXT_PUBLIC_APP_URL="https://你的域名"

# 生产建议配置 SMTP（注册验证码）
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

`NEXTAUTH_URL` 与 `NEXT_PUBLIC_APP_URL` 必须与浏览器访问地址一致（含 `https`）。

## 2. 本地构建并运行（验证）

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

首次启动会自动执行 `prisma db push` 同步表结构（可通过 `RUN_DB_PUSH=false` 关闭）。

可选初始化数据：

```bash
docker compose -f docker-compose.prod.yml exec app sh -c "npm install -g ts-node typescript && ts-node prisma/seed.ts"
```

或在本机对同一 `DATABASE_URL` 执行 `pnpm seed`。

## 3. 部署到腾讯云 CVM / 轻量服务器

### 3.1 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3.2 拉代码并启动

```bash
git clone https://github.com/shanshiping/worship-songs.git
cd worship-songs
cp .env.production.example .env
# 编辑 .env

docker compose -f docker-compose.prod.yml up -d --build
```

### 3.3 Nginx 反向代理 + HTTPS

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

SSL 可使用腾讯云免费证书。

### 3.4 安全组

- 开放 **80 / 443** 给公网
- **5432** 仅内网或白名单（不要对公网开放数据库）
- **3000** 可只对 127.0.0.1（由 Nginx 反代）

## 4. 使用 TCR + CVM 拉镜像（可选）

```bash
# 本地构建并推送
docker build -t ccr.ccs.tencentyun.com/<namespace>/worship-songs:latest .
docker push ccr.ccs.tencentyun.com/<namespace>/worship-songs:latest

# 服务器上
docker pull ccr.ccs.tencentyun.com/<namespace>/worship-songs:latest
docker run -d --name worship-songs \
  -p 3000:3000 \
  --env-file .env \
  -v worship_uploads:/app/public/uploads \
  --restart unless-stopped \
  ccr.ccs.tencentyun.com/<namespace>/worship-songs:latest
```

## 5. 更新发版

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

若 schema 有变且关闭了自动 push：

```bash
docker compose -f docker-compose.prod.yml exec app prisma db push
```

## 6. 开发用数据库（已有）

本地开发 Postgres：

```bash
docker compose up -d   # 仅 postgres，见 docker-compose.yml
```

## 常见问题

### 上传文件丢失？

歌谱/音频保存在 `public/uploads`，必须通过 volume 持久化。`docker-compose.prod.yml` 已挂载 `uploads_data`。

### 能否像前后端分离那样部署？

不建议。本项目 SSR、NextAuth、API Routes 依赖 Node 运行时，应作为 **一个 Next.js 服务** 部署。静态 CDN 只能加速 `/_next/static` 等资源，不能单独托管整站。

### Vercel 还能用吗？

可以，见 [DEPLOY.md](./DEPLOY.md)。Docker 方案适合腾讯云自建、内网访问或需要持久化本地上传文件的场景。
