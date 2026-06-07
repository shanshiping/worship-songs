# 部署指南 - 免费公网部署

## 方案：Vercel + Supabase（完全免费）

### 第一步：创建 Supabase 数据库

1. 访问 https://supabase.com 注册账号
2. 创建新项目（选择免费套餐）
3. 记录数据库连接字符串（Settings → Database → Connection string → URI）

### 第二步：配置环境变量

创建 `.env.production` 文件：

```env
# Supabase 数据库连接
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-random-secret-key-here"

# 应用 URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 第三步：推送到 GitHub

```bash
# 初始化 git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库并推送
# 在 GitHub 上创建新仓库，然后：
git remote add origin https://github.com/your-username/worship-songs.git
git push -u origin main
```

### 第四步：部署到 Vercel

1. 访问 https://vercel.com 注册账号
2. 点击 "New Project"
3. 导入你的 GitHub 仓库
4. 配置环境变量：
   - `DATABASE_URL` = 你的 Supabase 数据库连接字符串
   - `NEXTAUTH_URL` = 你的 Vercel 应用 URL（如 `https://worship-songs.vercel.app`）
   - `NEXTAUTH_SECRET` = 随机字符串（可以用 `openssl rand -base64 32` 生成）
   - `NEXT_PUBLIC_APP_URL` = 你的 Vercel 应用 URL
5. 点击 "Deploy"

### 第五步：初始化数据库

部署成功后，需要初始化数据库：

1. 在 Vercel 项目设置中，找到 "Functions" 或 "Terminal"
2. 运行以下命令：

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库结构
npx prisma db push

# 运行种子脚本（创建初始数据）
npx ts-node prisma/seed.ts
```

或者，你可以在本地连接 Supabase 数据库运行迁移：

```bash
# 在本地设置 DATABASE_URL 为 Supabase 数据库
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 运行迁移
npx prisma migrate dev --name init

# 运行种子脚本
npm run seed
```

### 第六步：访问你的应用

部署完成后，Vercel 会给你一个公网地址，如：
- `https://worship-songs.vercel.app`

任何人都可以通过这个地址访问你的应用！

---

## 其他免费方案

### 方案 B：Railway（支持 SQLite）

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 创建新项目 → Deploy from GitHub repo
4. Railway 会自动检测 Next.js 项目并部署
5. 数据库会持久化保存

### 方案 C：本地隧道（临时测试）

使用 ngrok 创建本地隧道：

```bash
# 安装 ngrok
brew install ngrok

# 启动 Next.js 应用
npm run dev

# 在另一个终端运行 ngrok
ngrok http 3000
```

ngrok 会给你一个公网地址，如 `https://xxxx.ngrok.io`

注意：ngrok 免费版有限制，每次重启地址会变。

---

## 常见问题

### Q: 部署后数据会丢失吗？
A: 使用 Supabase 数据库不会丢失。如果是 Railway 的 SQLite，需要配置持久化存储。

### Q: 可以绑定自己的域名吗？
A: 可以！在 Vercel 项目设置中添加自定义域名即可。

### Q: 有访问限制吗？
A: Vercel 免费套餐有 100GB/月带宽，足够个人使用。

### Q: 如何更新应用？
A: 推送代码到 GitHub，Vercel 会自动重新部署。

---

## 快速命令总结

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.production
# 编辑 .env.production 填入 Supabase 数据库信息

# 3. 初始化数据库
npx prisma generate
npx prisma db push
npm run seed

# 4. 推送到 GitHub
git add .
git commit -m "Ready for deployment"
git push

# 5. 在 Vercel 部署（网页操作）
# 访问 vercel.com → New Project → Import GitHub Repo → Deploy
```
