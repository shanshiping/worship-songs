# 敬拜选歌平台

一个专为敬拜团队设计的选歌管理平台，支持歌曲管理、聚会记录、团队协作、中英双语界面等功能。

## 功能架构

平台按模块划分，数据以 PostgreSQL + Prisma 为中心，前端为 Next.js App Router。

```
┌─────────────────────────────────────────────────────────────┐
│  UI（中英可切换，Cookie 持久化，无 URL 语言前缀）              │
│  Dashboard · Songs · Meetings · Teams · Leaderboard · Data  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  API Routes（Next.js）                                       │
│  /api/songs · /api/meetings · /api/teams · /api/leaderboard │
│  /api/import · /api/auth · …                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Domain                                                      │
│  Song（含元数据）· Meeting · Category · User/Role · Team     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  PostgreSQL（Prisma）                                        │
└─────────────────────────────────────────────────────────────┘
```

**聚会选歌（新建）数据流：**

```
/meetings/new ──debounce──► GET /api/songs?search=
        │                         │
        │                    有结果 → 点选 Song.id
        │                    无结果 → POST /api/songs（手动建歌）→ Song.id
        ▼
POST /api/meetings { songIds } ──► MeetingSong ──► PostgreSQL
```

| 模块 | 职责 | 主要路由 |
|------|------|----------|
| **仪表盘** | 概览与常用入口 | `/dashboard` |
| **歌曲** | 曲库 CRUD、歌谱/音频、歌词、元数据（调/拍号/作曲/作词/团队/专辑/MV）、分类、搜索 | `/songs` |
| **聚会** | 聚会记录与选歌；列表按年/月筛选；新建时服务端搜索曲库（不区分大小写），无结果可手动建歌并加入 | `/meetings` |
| **排行榜** | 按使用次数完整排名；年份筛选；分页 10/20/50 | `/leaderboard` |
| **数据** | Excel 导入导出（可按年） | `/data` |
| **分享** | 公开分享页（无需登录） | `/share/...` |
| **用户与权限** | 邮箱/手机登录、个人设置、四角色；超管用户管理 | `/settings` `/admin` |
| **团队** | 团队与成员、站内聊天 | `/teams` |
| **国际化** | `en` / `zh` UI（默认 `en`，Cookie `locale`，无 URL 前缀） | Header / Sidebar / 登录页 |

### 近期规格索引

| 功能 | 设计文档 |
|------|----------|
| 中英双语 | [`2026-07-17-i18n-en-zh-design.md`](docs/superpowers/specs/2026-07-17-i18n-en-zh-design.md) |
| 歌曲元数据 | [`2026-07-17-song-metadata-fields-design.md`](docs/superpowers/specs/2026-07-17-song-metadata-fields-design.md) |
| 排行榜年份与分页 | [`2026-07-17-leaderboard-pagination-year-design.md`](docs/superpowers/specs/2026-07-17-leaderboard-pagination-year-design.md) |
| 聚会年份筛选 | [`2026-07-17-meetings-year-filter-design.md`](docs/superpowers/specs/2026-07-17-meetings-year-filter-design.md) |
| 聚会选歌搜索与手动加歌 | [`2026-07-17-meeting-song-search-design.md`](docs/superpowers/specs/2026-07-17-meeting-song-search-design.md) |
| 选歌 Agent | [`2026-08-04-song-selection-agent-design.md`](docs/superpowers/specs/2026-08-04-song-selection-agent-design.md) |

全部规格与计划见 [`docs/superpowers/`](docs/superpowers/)。

## 功能特性

### 核心功能
- 🎵 **歌曲管理** - 添加、编辑、删除歌曲；支持歌谱与音频上传、歌词编辑
- 🎼 **歌曲元数据** - 调、拍号（预设 + 自定义）、作曲、作词、团队（自由文本）、专辑、MV 外链
- 📅 **聚会记录** - 记录每次聚会的歌曲选择、讲员、主领等；支持按年、月筛选
- ➕ **聚会选歌** - 新建聚会时搜索曲库（不区分大小写）；搜不到可手动新建并加入
- 🏆 **歌曲排行榜** - 按使用次数完整排名，支持年份筛选与分页
- 📁 **分类管理** - 对歌曲进行分类管理
- 📊 **数据导入导出** - 支持 Excel 格式的数据导入导出
- 🔗 **分享功能** - 生成分享链接，方便团队成员查看

### 用户系统
- 👤 **用户注册/登录** - 支持邮箱注册和登录
- 📱 **手机验证码登录** - 支持手机号+验证码登录
- 🔐 **权限管理** - 超级管理员、管理员、领队、成员四种角色
- ⚙️ **个人设置** - 修改个人信息和密码
- 💾 **记住密码** - 支持记住密码和自动登录

### 团队协作
- 👥 **团队管理** - 创建、编辑、删除团队
- 🏠 **成员管理** - 添加、删除团队成员，设置成员角色
- 💬 **在线聊天** - 团队成员实时聊天
- 📢 **消息通知** - 新消息提醒

### 界面特性
- 🌐 **中英双语** - 全站 UI 可切换中/英文（默认英文，偏好写入 Cookie，无 URL 前缀）
- 📱 **响应式设计** - 支持桌面端和移动端
- 🎨 **现代化 UI** - 使用 shadcn/ui 组件库，界面简洁美观

## 技术栈

- **前端框架**: Next.js 16 (App Router) + React 19
- **UI 组件**: shadcn/ui + Tailwind CSS
- **数据库**: PostgreSQL + Prisma ORM v7
- **认证**: NextAuth.js
- **国际化**: 自研 `I18nProvider` + `src/messages/{en,zh}.json`
- **测试**: Vitest（API + `src/lib`，Mock Prisma）
- **Excel 处理**: xlsx (SheetJS)
- **图标**: Lucide React

## 快速开始

### 1. 安装依赖

```bash
cd worship-songs
pnpm install
```

### 运行测试

```bash
pnpm test
# 或监听模式
pnpm test:watch
```

测试覆盖 API 路由与 `src/lib` 纯函数；数据库使用 Mock，不连接真实 PostgreSQL。

### 2. 启动 PostgreSQL（Docker）

需先安装并启动 [Docker Desktop](https://www.docker.com/products/docker-desktop/)，然后：

```bash
docker compose up -d
```

默认账号：`postgres` / `postgres`，库名：`worship_songs`，端口：`5432`。  
若 5432 已被占用：`POSTGRES_PORT=5433 docker compose up -d`，并把 `DATABASE_URL` 端口改成 `5433`。  
本机已有可用的 Postgres 且库名一致时，可跳过本步。  
停止：`docker compose down`（加 `-v` 会清空数据卷）。

### 3. 配置环境变量

复制 `.env.example` 文件并配置：

```bash
cp .env.example .env
```

使用上面的 Docker 时，`.env` 中数据库可直接用示例值：

```env
# 数据库（与 docker-compose.yml 一致）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/worship_songs"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# 应用 URL（用于分享链接）
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 选歌 Agent（可选；免费测试可用 Groq，见 .env.example）
# AI_API_KEY=""
# AI_BASE_URL="https://api.groq.com/openai/v1"
# AI_MODEL="llama-3.3-70b-versatile"
```

若你已有本机 Postgres，把 `DATABASE_URL` 改成自己的连接串即可。

### 4. 初始化数据库

```bash
# 运行数据库迁移
npx prisma migrate dev

# 初始化种子数据（创建默认分类和管理员账户）
pnpm seed
```

### 5. 导入 Excel 数据

```bash
# 导入敬拜赞美诗歌表数据
npx ts-node scripts/import-excel.ts
```

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 即可使用。

## 测试账户

| 角色 | 邮箱 | 密码 | 权限 |
|------|------|------|------|
| 超级管理员 | admin@worship.com | admin123 | 所有权限 + 用户管理 |
| 领队 | leader@worship.com | leader123 | 编辑、上传、下载 |
| 普通成员 | member@worship.com | member123 | 只能下载 |

## 功能说明

### 登录方式

1. **邮箱登录** - 输入邮箱和密码登录
2. **手机验证码登录** - 输入手机号，获取验证码后登录
3. **记住密码** - 勾选"记住密码"下次自动填充

### 歌曲元数据

上传或编辑歌曲时可填写（均为可选）：

| 字段 | 说明 |
|------|------|
| 调 (`key`) | 预设（如 C、G、Am）+ 可自定义输入 |
| 拍号 (`timeSignature`) | 预设（如 4/4、6/8）+ 可自定义输入 |
| 作曲 / 作词 | 文本 |
| 团队 | 自由文本（不关联协作「团队」模块） |
| 专辑 | 文本 |
| MV | 外链 URL（`http`/`https`），详情页新标签打开 |

歌词、音频、歌谱沿用原有能力。详情页仅展示已填字段；列表页不新增列。导入/导出暂未覆盖这些新字段。

### 聚会筛选与选歌

1. **年份 / 月份** - 聚会列表可按有数据的年份筛选，或按具体月份（`YYYY-MM`）筛选
2. **搜索曲库** - 新建聚会时按歌名/歌手搜索（不区分大小写）
3. **手动加歌** - 无匹配结果时可填写歌名、歌手、分类，当场创建并加入本次聚会

### 排行榜

1. **完整排名** - 按歌曲在聚会中的使用次数排序，支持翻页
2. **年份** - 可选「全部时间」或某一历年
3. **每页条数** - 10 / 20 / 50

### 语言切换

顶栏、侧栏与登录/注册页提供 **EN / 中文** 切换；偏好写入 Cookie `locale`（默认 `en`），仅翻译 UI 文案，不翻译曲库与 API 错误原文。

### 团队协作

1. **创建团队** - 点击"创建团队"按钮，输入团队名称和描述
2. **添加成员** - 在团队设置中输入成员邮箱添加
3. **在线聊天** - 进入团队后可以实时聊天
4. **成员管理** - 团队创建者可以设置成员角色

### 权限说明

| 功能 | 超级管理员 | 管理员 | 领队 | 成员 |
|------|-----------|--------|------|------|
| 查看歌曲/聚会 | ✅ | ✅ | ✅ | ✅ |
| 上传歌曲 | ✅ | ✅ | ✅ | ❌ |
| 编辑歌曲/聚会 | ✅ | ✅ | ✅ | ❌ |
| 删除歌曲/聚会 | ✅ | ✅ | ❌ | ❌ |
| 下载文件 | ✅ | ✅ | ✅ | ✅ |
| 导入数据 | ✅ | ✅ | ✅ | ❌ |
| 导出数据 | ✅ | ✅ | ✅ | ✅ |
| 管理分类 | ✅ | ✅ | ✅ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 团队管理 | ✅ | ✅ | ✅ | ✅ |
| 在线聊天 | ✅ | ✅ | ✅ | ✅ |

## 项目结构

```
worship-songs/
├── docs/superpowers/      # 功能设计规格与实现计划
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   ├── seed.ts            # 种子数据脚本
│   └── migrations/        # 数据库迁移文件
├── scripts/
│   └── import-excel.ts    # Excel 导入脚本
├── src/
│   ├── app/
│   │   ├── (auth)/        # 认证相关页面
│   │   ├── (main)/        # 主要功能页面
│   │   ├── api/           # API 路由
│   │   └── share/         # 分享页面
│   ├── components/
│   │   ├── layout/        # 布局组件（含 LanguageSwitcher）
│   │   ├── providers/     # Session / I18n 等 Provider
│   │   └── ui/            # UI 组件
│   ├── messages/          # 中英文案目录 en.json / zh.json
│   ├── hooks/             # 自定义 Hooks
│   └── lib/
│       ├── auth.ts        # 认证配置
│       ├── i18n.ts        # 国际化核心与类型
│       ├── prisma.ts      # Prisma 客户端
│       ├── permissions.ts # 权限管理
│       └── utils.ts       # 工具函数
└── public/                # 静态资源
```

## 部署

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

### 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

## 后续优化

- [ ] WebSocket 实现实时消息推送
- [ ] 文件上传到云存储
- [ ] 移动端 PWA 支持
- [ ] 深色模式
- [ ] 数据统计图表
- [ ] 消息通知系统

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
