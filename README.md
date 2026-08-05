# 敬拜选歌平台

一个专为敬拜团队设计的选歌管理平台，支持歌曲管理、聚会记录、团队协作、中英双语界面等功能。

## 功能架构

平台按模块划分，数据以 PostgreSQL + Prisma 为中心，前端为 Next.js App Router。

```
┌─────────────────────────────────────────────────────────────┐
│  UI（中英可切换，Cookie 持久化，无 URL 语言前缀）              │
│  Dashboard · Songs · Sheets · Meetings · Playlists · PPT · Teams · Leaderboard · Data  │
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
| **仪表盘** | 最近聚会、使命异象、使徒信经、快捷入口 | `/dashboard` |
| **主领选歌** | 主题/经文历史参考、首字母与搜索选歌、合并多页歌谱 PDF、预览/打印/下载 | `/sheets` |
| **歌曲** | 曲库 CRUD、多页歌谱/音频、歌词、元数据、标签、按歌名排序与首字母索引 | `/songs` |
| **歌单** | 独立歌单编排与分享 | `/playlists` |
| **歌词 PPT** | 批量生成歌词幻灯片 | `/ppt` |
| **聚会** | 聚会记录与选歌；列表按年/月筛选；新建时服务端搜索曲库（不区分大小写），无结果可手动建歌并加入 | `/meetings` |
| **主领统计** | 按主领姓名汇总常用歌曲；支持年份筛选 | `/meetings/leaders` |
| **排行榜** | 按使用次数完整排名；年份筛选；分页 10/20/50 | `/leaderboard` |
| **功能指南** | 各模块说明与操作提示（侧栏入口） | `/guide` |
| **数据** | Excel 导入导出（可按年） | `/data` |
| **分享** | 公开分享页（无需登录） | `/share/...` |
| **用户与权限** | 邮箱注册（验证码激活）、邮箱/手机登录、个人设置、四角色；超管用户管理 | `/settings` `/admin` |
| **团队** | 团队与成员（仅成员可见）、站内聊天、歌曲分享到团队 | `/teams` |
| **国际化** | `en` / `zh` UI（默认 `en`，Cookie `locale`，无 URL 前缀） | Header / Sidebar / 登录页 |

### 近期规格索引

| 功能 | 设计文档 |
|------|----------|
| 中英双语 | [`2026-07-17-i18n-en-zh-design.md`](docs/superpowers/specs/2026-07-17-i18n-en-zh-design.md) |
| 歌曲元数据 | [`2026-07-17-song-metadata-fields-design.md`](docs/superpowers/specs/2026-07-17-song-metadata-fields-design.md) |
| 排行榜年份与分页 | [`2026-07-17-leaderboard-pagination-year-design.md`](docs/superpowers/specs/2026-07-17-leaderboard-pagination-year-design.md) |
| 聚会年份筛选 | [`2026-07-17-meetings-year-filter-design.md`](docs/superpowers/specs/2026-07-17-meetings-year-filter-design.md) |
| 聚会选歌搜索与手动加歌 | [`2026-07-17-meeting-song-search-design.md`](docs/superpowers/specs/2026-07-17-meeting-song-search-design.md) |
| 歌谱 OCR / 歌词识别 | [`2026-08-04-lyrics-lrc-ocr-search-design.md`](docs/superpowers/specs/2026-08-04-lyrics-lrc-ocr-search-design.md) |
| 歌单 / 标签 / 分享 | [`2026-08-04-playlists-tags-share-design.md`](docs/superpowers/specs/2026-08-04-playlists-tags-share-design.md) |
| 关联经文 | [`2026-08-04-song-scripture-design.md`](docs/superpowers/specs/2026-08-04-song-scripture-design.md) |
| 快速编辑标签 | [`2026-08-04-quick-tag-select-design.md`](docs/superpowers/specs/2026-08-04-quick-tag-select-design.md) |
| 选歌 Agent | [`2026-08-04-song-selection-agent-design.md`](docs/superpowers/specs/2026-08-04-song-selection-agent-design.md) |

全部规格与计划见 [`docs/superpowers/`](docs/superpowers/)。

## 功能特性

### 核心功能
- 🏠 **首页概览** - 最近聚会、使命异象、使徒信经；紧凑统计与快捷入口
- 🎵 **歌曲管理** - 添加、编辑、删除歌曲；默认按歌名排序；**A–Z / # 首字母**快速定位；卡片/列表视图切换
- 🔍 **歌词搜索** - 独立搜索框在歌词正文中匹配；可与歌名、标签、首字母组合筛选
- 📄 **多页歌谱** - 每首歌可上传多页歌谱（PDF 与图片可混合）；详情页多页预览；主领选歌时自动合并为一份 PDF
- 📝 **歌谱 OCR** - 上传歌谱后自动识别歌词（可配置 Gemini / OpenAI 兼容模型）；支持手动「从歌谱识别」
- 🎤 **LRC 跟唱** - 上传 LRC 时间轴歌词；详情页随音频播放高亮当前行
- 🎼 **歌曲元数据** - 调、拍号（预设 + 自定义）、作曲、作词、团队（自由文本）、专辑、MV 外链
- 📖 **关联经文** - 每首歌可绑定多条经文引用与正文；主领选歌与搜索可据此推荐
- 📁 **分类/标签** - TYPE + STYLE 标签体系，多选筛选；领队及以上可管理标签；详情页快速改标签
- 📋 **主领选歌** - 主题/经文历史参考与智能推荐；首字母与搜索选歌；行内试听/看歌词；合并歌谱预览、打印与下载；内置选歌助手
- 📅 **聚会记录** - 记录每次聚会的歌曲选择、讲员、主领等；支持按年、月筛选
- ➕ **聚会选歌** - 新建聚会时搜索曲库（不区分大小写）；搜不到可手动新建并加入
- 👤 **主领统计** - 按主领汇总常用歌曲与聚会次数；可按年份筛选（`/meetings/leaders`）
- 🏆 **歌曲排行榜** - 按使用次数完整排名，支持年份筛选与分页
- 📂 **独立歌单** - 与聚会分开的歌单编排、排序与分享；曲库/详情页可一键加入歌单
- 🖥️ **歌词 PPT** - 搜索选歌（最多 20 首）、调整顺序后批量生成 `.pptx` 幻灯片
- 🤖 **选歌 Agent** - 右下角对话式选歌；可搜曲库、查热门、加入歌单；主领选歌页另有嵌入式助手
- 📊 **数据导入导出** - 支持 Excel 格式的数据导入导出（领队及以上可导入）
- 🔗 **分享功能** - 歌曲 / 聚会 / 歌单生成公开链接（无需登录）；含歌词、歌谱、元数据等
- 📖 **功能指南** - 侧栏「功能指南」与各模块操作说明（[`docs/帮助文档.md`](docs/帮助文档.md)）

### 用户系统
- 👤 **用户注册/登录** - 邮箱注册需验证码激活；支持邮箱密码登录
- 📧 **邮箱验证码** - 注册时发送 6 位验证码到邮箱，验证通过后方可创建账户
- 📱 **手机验证码登录** - 支持手机号+验证码登录
- 🔐 **权限管理** - 超级管理员、管理员、领队、成员四种角色
- ⚙️ **个人设置** - 修改个人信息和密码
- 💾 **记住密码** - 支持记住密码和自动登录

### 团队协作
- 👥 **团队管理** - 创建、编辑、删除团队；**仅团队成员可见**（非成员无法查看或访问）
- 🏠 **成员管理** - 在团队设置中**搜索用户名或邮箱**添加成员，设置成员角色
- 🎵 **分享歌曲到团队** - 歌曲详情页可将歌曲分享到团队，仅团队成员可见
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

# 歌谱 OCR（可选；用于从歌谱图片/PDF 识别歌词，见下文「歌谱 OCR 与歌词识别」）
# LYRICS_OCR_PROVIDER=gemini
# GEMINI_API_KEY=""
# GEMINI_MODEL="gemini-2.0-flash"

# 选歌 Agent（可选；免费测试可用 Groq，见下文「选歌 Agent」）
# AI_API_KEY=""
# AI_BASE_URL="https://api.groq.com/openai/v1"
# AI_MODEL="llama-3.3-70b-versatile"

# 注册邮箱验证码（可选；生产环境建议配置 SMTP，见下文「用户注册与邮箱验证」）
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_USER="your@email.com"
# SMTP_PASS="your-password"
# SMTP_FROM="noreply@example.com"
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

1. **邮箱登录** - 输入邮箱和密码登录（须已完成邮箱验证）
2. **手机验证码登录** - 输入手机号，获取验证码后登录
3. **记住密码** - 勾选"记住密码"下次自动填充

### 用户注册与邮箱验证

注册流程：

1. 填写姓名、邮箱、密码
2. 点击 **「发送验证码」**，6 位验证码将发送到邮箱（5 分钟内有效，60 秒后可重发）
3. 输入验证码并提交注册
4. 验证通过后创建账户，跳转登录页

**开发环境：** 未配置 SMTP 时，验证码会打印在运行 `pnpm dev` 的终端，例如：

```text
[Email] Verification code for user@example.com: 123456
```

**生产环境：** 在 `.env` 中配置 SMTP：

| 变量 | 说明 |
|------|------|
| `SMTP_HOST` | SMTP 服务器地址 |
| `SMTP_PORT` | 端口，默认 `587`（SSL 常用 `465`） |
| `SMTP_USER` | 发信账号（可选，视服务商而定） |
| `SMTP_PASS` | 发信密码或授权码 |
| `SMTP_FROM` | 发件人地址，默认同 `SMTP_USER` |

未验证邮箱的账户无法登录。

### 歌曲元数据

**路由：** 曲库 `/songs` · 上传 `/song-upload` · 详情 `/songs/[id]` · 编辑 `/songs/[id]/edit`

上传或编辑歌曲时可填写（均为可选）：

| 字段 | 说明 |
|------|------|
| 调 (`key`) | 预设（如 C、G、Am）+ 可自定义输入 |
| 拍号 (`timeSignature`) | 预设（如 4/4、6/8）+ 可自定义输入 |
| 作曲 / 作词 | 文本 |
| 团队 | 自由文本（不关联协作「团队」模块） |
| 专辑 | 文本 |
| MV | 外链 URL（`http`/`https`），详情页新标签打开 |
| LRC 歌词 | 带时间轴的跟唱歌词 |
| 关联经文 | 多条：引用 + 可选正文 |
| 标签 | TYPE / STYLE 多选 |

歌词、音频、**多页歌谱**、封面图沿用原有能力。详情页仅展示已填字段。导入/导出暂未覆盖标签、经文、LRC 等新字段。

### 曲库排序与首字母索引

- 歌曲列表默认按**歌名字母顺序**排列
- 列表与主领选歌页均提供 **A–Z / #** 首字母条，点击快速筛选；可与关键词、标签、歌词搜索组合
- 中文歌名按拼音首字母归类；数字或符号开头归入 `#`
- 数据库字段 `titleInitial` 在新建/编辑歌曲时自动写入；首次访问 `/api/songs/letters` 会补全历史数据

批量补全首字母（可选）：

```bash
pnpm sync-song-initials
```

### 曲库搜索、标签与经文

**搜索：**

| 搜索框 | 匹配范围 |
|--------|----------|
| 歌名/歌手 | 标题、歌手（不区分大小写） |
| 搜索歌词 | 仅歌词正文 |
| 首字母 | `titleInitial` 字段；可与上述组合 |

**标签：**

- **TYPE**（类型）与 **STYLE**（风格）多选；多个标签为 AND 关系
- 列表卡片上点击标签徽章可快速切换筛选
- 领队及以上在曲库页可「管理标签」增删改 TYPE/STYLE
- 歌曲详情页点击封面区域可快速编辑标签

**经文：**

- 上传/编辑页「关联经文」：引用必填（如「约翰福音 3:16」），正文可选
- 歌名搜索也会匹配经文**引用**（不匹配正文）
- 主领选歌填写经文后，可推荐库内关联该经文的歌曲及历史选歌

### LRC 跟唱

- 上传/编辑时可填写 **LRC 时间轴歌词**，格式示例：`[00:12.00]第一句歌词`
- 歌曲详情页：有 LRC 时随音频播放高亮当前行；仅有纯文本歌词时静态显示
- 公开分享页显示纯文本歌词（无 LRC 同步）

### 多页歌谱与主领选歌

- 每首歌可上传**多页**歌谱（PNG/JPG/PDF 可混排）；详情页支持多页翻页预览
- **主领选歌**（`/sheets`）工作流：
  1. 填写**主题**（≥2 字）→ 搜索相似历史聚会及当时选歌
  2. 填写**经文** → 匹配库内关联经文与历史选歌
  3. 关键词或 **A–Z / #** 首字母搜索选歌；行内可试听、预览歌词
  4. 智能推荐区可「全部添加」某次聚会的歌单
  5. 右侧调整已选顺序（最多 20 首）→ 合并预览 PDF → 打印或下载
- 页面左栏底部有**嵌入式选歌助手**（需配置 `AI_*` 环境变量）
- 合并 API 会将各首歌的多页歌谱按顺序拼成一份 PDF；无歌谱的曲目会跳过并提示

### 歌单

歌单与聚会的区别：

| | 歌单 | 聚会 |
|---|------|------|
| 用途 | 排练清单、主题合集、对外分享 | 记录某次崇拜实际使用的歌曲 |
| 是否影响排行榜 | 否 | 是 |

- 创建： `/playlists` → 新建 → 填写名称与描述
- 添加歌曲：歌单详情页搜索添加；或曲库/歌曲详情「加入歌单」（可当场新建歌单）
- 排序、移除、编辑信息、分享、删除（创建者或管理员）
- 成员可浏览所有歌单；领队可创建并编辑**自己**的歌单；管理员可编辑任意歌单

### 歌词 PPT

**路由：** `/ppt`

1. 搜索并添加歌曲（最多 20 首）
2. 右侧调整顺序（上移/下移）
3. 点击生成，下载 `.pptx` 文件（每首歌一页或多页，按歌词分段）

需有下载权限（领队及以上）。

### 分享

**路由：** `/share/[type]/[id]?token=...`（公开，无需登录）

| type | 内容 |
|------|------|
| `song` | 单首：歌词、歌谱、音频、元数据、标签、经文、最近聚会记录 |
| `meeting` | 聚会信息 + 有序歌曲列表 |
| `playlist` | 歌单信息 + 有序歌曲列表 |

在歌曲/聚会/歌单详情页点击「分享」复制链接即可。

### 主领统计

**路由：** `/meetings/leaders`（聚会列表页入口）

- 按**主领姓名**汇总各自主领过的歌曲及使用次数
- 支持按**年份**筛选；可点选某位主领查看其 Top 歌曲
- 主领姓名在保存聚会时写入，同名会自动归并统计

### 功能指南与帮助文档

- 侧栏 **「功能指南」**（`/guide`）浏览各模块说明；顶栏帮助按钮打开同款内容的侧滑面板
- 详细操作步骤见 [`docs/帮助文档.md`](docs/帮助文档.md)；产品背景见 [`docs/功能介绍报告.md`](docs/功能介绍报告.md)

### 曲库去重与标题清理

若历史导入产生重复歌曲（如 `破碎` 与 `破碎；`），可运行：

```bash
pnpm dedupe-songs          # 预览：合并重复项、去掉歌名中的 ; ；
pnpm dedupe-songs --apply  # 写入数据库
```

合并时会保留信息更完整的一条，并把聚会、歌单、标签等关联迁移过去。新建/编辑歌曲时也会自动去掉歌名中的分号。

### 歌谱 OCR 与歌词识别

上传歌谱（图片或 PDF）后，平台可调用视觉模型自动提取纯文本歌词并保存。需配置环境变量；未配置时识别接口返回 503，其余功能不受影响。

**自动识别时机：**

1. **上传歌谱时** — 新建/编辑页上传成功后，若歌词为空，自动识别并填入表单
2. **保存歌曲时** — 创建或更换歌谱且歌词为空时，服务端自动识别并写入数据库
3. **打开歌曲详情时** — 有歌谱但无歌词时，自动识别并保存（可手动点击「从歌谱识别」重试）

已有歌词时不会被覆盖；仅当歌词为空时才会自动识别。

#### 环境变量

| 变量 | 说明 |
|------|------|
| `LYRICS_OCR_PROVIDER` | `gemini` 或 `openai`（OpenAI 兼容 API） |
| `GEMINI_API_KEY` | Gemini API 密钥（provider 为 gemini 时必填） |
| `GEMINI_MODEL` | Gemini 模型名，默认 `gemini-2.0-flash` |
| `LYRICS_OCR_API_KEY` | OpenAI 兼容 API 密钥（可选，可复用 `AI_API_KEY`） |
| `LYRICS_OCR_BASE_URL` | OpenAI 兼容 Base URL（可选，可复用 `AI_BASE_URL`） |
| `LYRICS_OCR_MODEL` | OpenAI 兼容模型名（可选，可复用 `AI_MODEL`） |

**未设置 `LYRICS_OCR_PROVIDER` 时的自动选择：**

- 配置了 `GEMINI_API_KEY` → 使用 Gemini
- 否则配置了 `AI_API_KEY` 或 `LYRICS_OCR_API_KEY` → 使用 OpenAI 兼容接口

#### 方案 A：Gemini（推荐，支持图片 + PDF）

在 [Google AI Studio](https://aistudio.google.com/apikey) 申请 API Key，写入 `.env`：

```env
LYRICS_OCR_PROVIDER=gemini
GEMINI_API_KEY=你的密钥
GEMINI_MODEL=gemini-2.0-flash
```

常用模型：`gemini-2.0-flash`（默认，快且省）、`gemini-2.5-flash`、`gemini-1.5-pro`（通常更准，更慢更贵）。

#### 方案 B：OpenAI 兼容 API（仅图片）

适用于 OpenAI、Azure OpenAI 或提供 OpenAI 兼容 `/chat/completions` 且支持视觉的代理。**不支持 PDF 歌谱**；PDF 请改用 Gemini 或上传 PNG/JPG。

**独立配置：**

```env
LYRICS_OCR_PROVIDER=openai
LYRICS_OCR_API_KEY=你的密钥
LYRICS_OCR_BASE_URL=https://api.openai.com/v1
LYRICS_OCR_MODEL=gpt-4o-mini
```

**复用选歌 Agent 的配置（见下文）：**

```env
LYRICS_OCR_PROVIDER=openai
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

#### 提供商对比

| 提供商 | 图片歌谱 | PDF 歌谱 | 模型配置项 |
|--------|----------|----------|------------|
| Gemini | ✅ | ✅ | `GEMINI_MODEL` |
| OpenAI 兼容 | ✅ | ❌ | `LYRICS_OCR_MODEL` 或 `AI_MODEL` |

修改 `.env` 后需**重启开发服务器**（`pnpm dev`）生效。

#### 手动识别

上传/编辑页歌词区域旁有 **「从歌谱识别」** 按钮；歌曲详情页在无歌词时也可点击识别。若已有歌词，手动识别会先确认是否覆盖。

### 选歌 Agent

**入口：**

1. 任意主页面右下角**对话浮动按钮**（全局 Agent）
2. 主领选歌页（`/sheets`）左栏底部**嵌入式助手**（自动带入当前主题/经文）

与歌谱 OCR **独立配置**（使用 `AI_*` 变量，不影响 `GEMINI_*`）。

**能做什么：**

- 自然语言搜歌：「找几首复活节、活泼的敬拜歌」「歌词里有『恩典』的歌」
- 查热门：「最近大家常选的前五首是什么？」
- 加入歌单：「把《Amazing Grace》加到我的主日歌单」（需领队及以上且对该歌单有编辑权）
- 仅推荐工具返回的真实歌曲，不会编造曲库中不存在的歌

**对话历史**保存在浏览器 `localStorage`（按用户区分）；换设备或清缓存会丢失。

免费测试推荐 [Groq](https://console.groq.com/keys)：

```env
AI_API_KEY=你的 Groq 密钥
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

也可指向 OpenAI 官方或其他 OpenAI 兼容服务，按需修改 `AI_BASE_URL` 与 `AI_MODEL`。

### 数据导入导出

**路由：** `/data`（侧栏「数据」，领队及以上可见）

| 操作 | 权限 | 说明 |
|------|------|------|
| 导入 Excel | 领队及以上 | 批量写入曲库/聚会，适合初次迁移 |
| 导出 Excel | 全员 | 可按年份导出供本地备份 |

导入/导出**暂未包含**全部新字段（标签、经文、LRC、多页歌谱路径等）；以界面手动维护为准。

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

团队数据**仅对成员可见**：列表、详情、聊天、共享歌曲等 API 均校验成员身份，非成员返回 403。

1. **创建团队** - 在 `/teams` 点击「创建团队」，输入名称和描述；创建者自动成为 OWNER
2. **添加成员** - 进入团队 **设置**，搜索**用户名或邮箱**选择用户，设置角色（管理员/成员）后添加；仅创建者和管理员可添加
3. **分享歌曲** - 在歌曲详情页点击「分享到团队」，选择目标团队；团队成员可在团队页「共享歌曲」侧边栏查看
4. **在线聊天** - 进入团队后发送消息，团队成员实时可见
5. **成员管理** - 创建者可修改成员角色、移除成员

**说明：** 协作「团队」模块与歌曲元数据中的「团队」字段无关——后者仅为自由文本（如「某某诗班」）。

**相关 API：**

| 接口 | 说明 |
|------|------|
| `GET/POST /api/teams` | 团队列表（仅本人所在团队）/ 创建团队 |
| `GET/PUT/DELETE /api/teams/[id]` | 团队详情与设置（须为成员） |
| `GET /api/teams/[id]/members/search?q=` | 搜索待添加用户（须为 OWNER/ADMIN） |
| `POST /api/teams/[id]/members` | 添加成员（`userId` 或 `email`） |
| `GET/POST/DELETE /api/teams/[id]/songs` | 查看 / 分享 / 移除团队共享歌曲 |
| `GET/POST /api/teams/[id]/messages` | 团队聊天消息 |

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
| 管理标签 (TYPE/STYLE) | ✅ | ✅ | ✅ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 团队管理 | ✅ | ✅ | ✅ | ✅ |
| 在线聊天 | ✅ | ✅ | ✅ | ✅ |

**用户管理**（`/admin/users`）仅超级管理员可见，用于调整用户角色。

## 项目结构

```
worship-songs/
├── docs/superpowers/      # 功能设计规格与实现计划
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   ├── seed.ts            # 种子数据脚本
│   └── migrations/        # 数据库迁移文件
├── scripts/
│   ├── import-excel.ts       # Excel 导入脚本
│   ├── dedupe-songs.ts       # 曲库去重与标题清理
│   └── sync-song-initials.ts # 批量补全首字母字段
├── src/
│   ├── app/
│   │   ├── (auth)/        # 认证相关页面
│   │   ├── (main)/        # 主要功能页面（dashboard、songs、sheets、meetings…）
│   │   ├── api/           # API 路由
│   │   └── share/         # 公开分享页
│   ├── components/
│   │   ├── layout/        # 布局组件（含 LanguageSwitcher）
│   │   ├── providers/     # Session / I18n 等 Provider
│   │   └── ui/            # UI 组件
│   ├── messages/          # 中英文案目录 en.json / zh.json
│   ├── hooks/             # 自定义 Hooks
│   └── lib/
│       ├── auth.ts              # 认证配置
│       ├── send-email.ts        # 注册验证码邮件
│       ├── verification-codes.ts # 邮箱/手机验证码存储
│       ├── i18n.ts              # 国际化核心与类型
│       ├── prisma.ts            # Prisma 客户端
│       ├── permissions.ts       # 权限管理
│       ├── lyrics-ocr.ts        # 歌谱 OCR 路由（Gemini / OpenAI）
│       ├── song-title-index.ts  # 歌名首字母索引
│       ├── sheet-pdf-merge.ts   # 多页歌谱 PDF 合并
│       ├── ppt-lyrics.ts        # 歌词 PPT 生成
│       └── utils.ts             # 工具函数
└── public/                # 静态资源
```

## 部署

### Docker + 腾讯云（推荐自建）

Next.js 为全栈单体（页面 + API 同一进程），一个 Docker 容器即可。

```bash
cp .env.production.example .env
# 编辑 DATABASE_URL、NEXTAUTH_URL 等

docker compose -f docker-compose.prod.yml up -d --build
```

详细步骤（TencentDB、Nginx、HTTPS、TCR）：[`docs/deploy-tencent-cloud-docker.md`](docs/deploy-tencent-cloud-docker.md)

### 构建生产版本

```bash
pnpm build
pnpm start
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
