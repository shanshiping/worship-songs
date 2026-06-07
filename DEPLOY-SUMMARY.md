# 敬拜选歌平台 - 部署总结

## 项目概述

**项目名称**: 敬拜选歌平台 (Worship Songs)
**项目地址**: https://github.com/shanshiping/worship-songs
**线上地址**: https://worship-songs-3pha-2vkyq97dh-shanshipings-projects.vercel.app

## 技术架构

| 技术 | 说明 |
|------|------|
| **前端框架** | Next.js 16 (App Router) |
| **UI 组件** | shadcn/ui + Tailwind CSS |
| **数据库** | PostgreSQL (Neon) |
| **ORM** | Prisma v7 |
| **认证** | NextAuth.js |
| **部署平台** | Vercel |
| **代码托管** | GitHub |

## 部署流程

### 1. 创建 GitHub 仓库

```bash
# 初始化 Git
git init
git add -A
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/shanshiping/worship-songs.git
git branch -M main
git push -u origin main
```

### 2. 创建 Neon 数据库

1. 访问 https://neon.tech
2. 使用 GitHub 账号登录
3. 创建新项目
4. 获取数据库连接字符串：
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx.pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3. 配置环境变量

在项目根目录创建 `.env.production`：

```env
# Neon 数据库
DATABASE_URL="postgresql://neondb_owner:npg_xxxx@ep-delicate-cloud-a4nbq7wq-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-random-secret-key"

# 应用 URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 4. 部署到 Vercel

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 **New Project**
4. 导入 `shanshiping/worship-songs` 仓库
5. 配置环境变量（同上）
6. 点击 **Deploy**

### 5. 初始化数据库

```bash
# 设置环境变量
export DATABASE_URL="postgresql://neondb_owner:npg_xxxx@ep-delicate-cloud-a4nbq7wq-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# 推送数据库结构
npx prisma db push --accept-data-loss

# 初始化数据
npm run seed
```

## 遇到的问题及解决方案

### 问题 1：Prisma v7 需要 Adapter

**错误信息**：
```
Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.
```

**解决方案**：
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })
```

### 问题 2：Prisma Schema 不支持 url 属性

**错误信息**：
```
The datasource property `url` is no longer supported in schema files.
```

**解决方案**：
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  // 移除 url 属性，改用 prisma.config.ts
}
```

```typescript
// prisma.config.ts
export default defineConfig({
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
```

### 问题 3：TypeScript 隐式 any 类型

**错误信息**：
```
Parameter 'item' implicitly has an 'any' type.
```

**解决方案**：
```typescript
// 添加类型注解
topSongs.map(async (item: any, index: number) => {
  // ...
})
```

### 问题 4：Supabase 连接失败

**问题**：Supabase 的直连模式（端口 5432）从外部无法访问

**解决方案**：切换到 Neon 数据库，连接更稳定

### 问题 5：音乐元数据库构建失败

**问题**：`music-metadata` 模块在构建时无法解析

**解决方案**：移除对 `music-metadata` 的依赖，简化文件上传逻辑

## 项目结构

```
worship-songs/
├── prisma/
│   ├── schema.prisma      # 数据库模型
│   ├── seed.ts            # 种子数据
│   └── config.ts          # Prisma 配置
├── src/
│   ├── app/
│   │   ├── (auth)/        # 认证页面（登录/注册）
│   │   ├── (main)/        # 主要功能页面
│   │   ├── api/           # API 路由
│   │   └── share/         # 分享页面
│   ├── components/
│   │   ├── layout/        # 布局组件
│   │   ├── providers/     # 上下文提供者
│   │   └── ui/            # UI 组件
│   ├── hooks/             # 自定义 Hooks
│   └── lib/               # 工具函数
├── scripts/               # 脚本文件
└── public/                # 静态资源
```

## 功能清单

### ✅ 已实现功能

| 功能 | 说明 |
|------|------|
| 用户注册/登录 | 邮箱密码登录、手机验证码登录 |
| 权限管理 | 超级管理员、管理员、领队、成员 |
| 歌曲管理 | CRUD、分类、歌谱/音频上传 |
| 聚会记录 | CRUD、关联歌曲 |
| 歌曲排行榜 | 按使用次数排序 |
| 数据导入导出 | Excel 格式 |
| 团队协作 | 创建团队、成员管理 |
| 在线聊天 | 团队内实时聊天 |
| 分享功能 | 生成分享链接 |
| 响应式设计 | 支持桌面/平板/手机 |

### 📊 数据统计

| 项目 | 数量 |
|------|------|
| 聚会记录 | 313 条 |
| 歌曲总数 | 672 首 |
| 歌曲分类 | 6 个 |
| 时间跨度 | 2012-2025 年 |

## 默认账户

| 角色 | 邮箱 | 密码 | 权限 |
|------|------|------|------|
| 超级管理员 | admin@worship.com | admin123 | 所有权限 |
| 领队 | leader@worship.com | leader123 | 编辑、上传、下载 |
| 普通成员 | member@worship.com | member123 | 只能下载 |

## 本地开发

```bash
# 克隆项目
git clone https://github.com/shanshiping/worship-songs.git
cd worship-songs

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 初始化数据库
npx prisma db push
npm run seed

# 启动开发服务器
npm run dev
```

## 后续优化建议

1. **性能优化**
   - 添加 Redis 缓存
   - 优化图片/音频存储
   - 添加 CDN 加速

2. **功能扩展**
   - WebSocket 实时消息
   - 移动端 PWA 支持
   - 深色模式
   - 数据统计图表

3. **安全加固**
   - 添加 CSRF 保护
   - 限制文件上传大小
   - 添加 Rate Limiting

4. **运维优化**
   - 添加日志系统
   - 监控告警
   - 自动备份

---

**部署时间**: 2026-06-07
**部署人**: shanshiping
