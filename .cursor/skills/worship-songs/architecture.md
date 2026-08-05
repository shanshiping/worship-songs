# worship-songs 架构参考

## 目录结构

```
worship-songs/
├── AGENTS.md                 # Agent 入口（根目录）
├── prisma/
│   ├── schema.prisma         # 数据模型
│   ├── seed.ts               # 种子：默认用户、标签
│   └── migrations/
├── scripts/
│   ├── import-excel.ts       # 历史 Excel 导入
│   ├── dedupe-songs.ts       # 曲库去重、去分号标题
│   ├── sync-song-initials.ts # 批量 titleInitial
│   └── docker-entrypoint.sh  # 生产容器入口
├── docs/
│   ├── 帮助文档.md            # 用户操作手册
│   ├── deploy-tencent-cloud-docker.md
│   └── superpowers/specs/    # 功能设计规格
├── src/
│   ├── app/
│   │   ├── (auth)/           # login, register
│   │   ├── (main)/           # 需登录的主功能页
│   │   ├── api/              # REST API
│   │   └── share/            # 公开分享页（无 auth layout）
│   ├── components/           # UI 组件
│   │   ├── layout/           # main-layout, sidebar, header
│   │   ├── providers/        # session, i18n
│   │   └── ui/               # shadcn 基元
│   ├── hooks/                # usePermissions 等
│   ├── lib/                  # 领域逻辑（优先放这里）
│   │   └── ai/               # Agent prompt、tools、search
│   └── messages/             # en.json, zh.json
├── tests/
│   ├── api/                  # API route 测试
│   ├── lib/                  # lib 纯函数测试
│   ├── unit/                 # 组件/小模块测试
│   └── helpers/              # mock-prisma, jsonRequest
└── public/uploads/           # 用户上传文件
```

## 请求流

### 典型页面

```
Browser → Next.js page (client component)
       → fetch('/api/...')
       → route.ts → getCurrentUser/requirePermission
       → prisma / src/lib/*
       → JSON response
```

### 主领选歌合并 PDF

```
/sheets 选歌列表
  → POST /api/songs/sheets/merge { songIds, order }
  → sheet-pdf-merge.ts（pdf-lib + sharp）
  → 返回 application/pdf blob
  → 预览 / 打印 / 下载
```

### 聚会新建选歌

```
/meetings/new
  → debounce GET /api/songs?search=
  → 选中 → songId
  → 无结果 → POST /api/songs（手动建歌）
  → POST /api/meetings { songIds, ... }
  → MeetingSong 写入 DB
```

### 选歌 Agent

```
SongAgentChat / SheetsAgentPanel
  → POST /api/agent/chat（streaming）
  → song-agent-prompt + createSongAgentTools()
  → tools: searchSongs, listTags, getPopularSongs,
           searchMeetingsByTheme, getScriptureRecommendations,
           listPlaylists, addSongToPlaylist
```

### 歌谱 OCR

```
上传/保存/打开详情
  → POST /api/songs/extract-lyrics 或 /api/songs/[id]/extract-lyrics
  → lyrics-ocr.ts → gemini-lyrics | openai-lyrics
  → 仅 lyrics 为空时自动写入
```

## 数据流：排行榜与主领统计

```
MeetingSong（每次聚会保存）
  ├─→ /api/leaderboard     groupBy songId 计数
  └─→ /api/meetings/leader-songs  按 leader 字段聚合
```

`leader` 为聚会上的自由文本；`leader-names.ts` 做归一化（去空格、大小写等）。

## 首字母索引

```
Song.title → song-title-index.ts → titleInitial (A-Z|#)
                                    titleInitialOrder (1-27)
  ├─ 新建/编辑 API 自动写入
  ├─ GET /api/songs/letters 触发历史补全
  └─ GET /api/songs?letter=X 筛选
```

中文歌名用 `pinyin-pro` 取拼音首字母；`#` 排最后（order=27）。

## 多页歌谱

```
sheetMusicPages: string[]   // JSON 数组，相对 public 路径
sheetMusic: string?        // 兼容旧单页
song-sheet-paths.ts        // 解析有效页列表、合并顺序
```

## 国际化

- Provider：`src/components/providers/i18n-provider.tsx`
- 键类型：`src/lib/i18n.ts`
- 默认 `en`；Cookie `locale`；**无** `/en/` URL 前缀
- 不翻译：歌曲名、歌词、用户输入、部分 API 错误原文

## 认证与 Session

- NextAuth 配置：`src/lib/auth.ts`
- 注册：`/api/auth/register` + `/api/auth/send-email-code`
- 手机验证码：`/api/auth/send-code`
- 服务端取用户：`getCurrentUser()` in `server-permissions.ts`

## 部署

| 方式 | 说明 |
|------|------|
| Docker | `docker-compose.prod.yml`，见 `docs/deploy-tencent-cloud-docker.md` |
| Vercel | 需外置 Postgres + 环境变量 |
| 本地 | `docker compose up -d` + `pnpm dev` |

生产构建：`pnpm build`（含 `prisma generate`）。

## 与协作「团队」的区别

| | Team 模块 | Song.team 字段 |
|---|-----------|----------------|
| 性质 | 用户组 + 聊天 + 共享歌曲 | 元数据自由文本 |
| API | `/api/teams/*` | 随 Song CRUD |
| 可见性 | 仅成员 | 全员（有权限时） |

## 文件上传

- API：`/api/upload`、`/api/files/upload`
- 存储：`public/uploads/` 下按类型分子目录
- 权限：上传需 LEADER+
