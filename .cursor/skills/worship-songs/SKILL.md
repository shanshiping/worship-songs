---
name: worship-songs
description: >-
  Architecture and feature map for the worship-songs platform (Next.js, Prisma,
  PostgreSQL). Use when developing, extending, debugging, or documenting this
  repo — songs, sheets, meetings, playlists, agent, OCR, i18n, teams, or tests.
---

# worship-songs 项目 Skill

## 何时使用

- 在本仓库新增/修改功能、API、页面、测试
- 排查曲库、主领选歌、聚会、Agent、OCR、分享等问题
- 需要快速定位「改哪个文件」或「数据从哪来」

## 项目定位

全栈敬拜选歌管理平台：曲库 CRUD、聚会记录、主领选歌（合并 PDF）、歌单、歌词 PPT、排行榜、团队聊天、选歌 AI Agent、公开分享、Excel 导入导出、中英双语。

## 架构（三层）

```
UI  src/app/(main)/*  +  src/components/*
         ↓ fetch
API  src/app/api/**/route.ts
         ↓
Domain  src/lib/*  →  Prisma  →  PostgreSQL
```

- **认证**：NextAuth，`getCurrentUser()` / `requirePermission()`（`server-permissions.ts`）
- **i18n**：`useI18n()` + `t('key')`；键在 `src/messages/en.json` 与 `zh.json` 成对维护
- **文件存储**：本地上传至 `public/uploads/`（歌谱、音频、封面）
- **可选 AI**：Agent 用 `AI_*`；OCR 用 `GEMINI_*` 或 `LYRICS_OCR_*`（互不依赖）

## 核心数据模型（Prisma）

| Model | 用途 |
|-------|------|
| `Song` | 曲库；含 `titleInitial`/`titleInitialOrder`、多页歌谱 `sheetMusicPages`、LRC、元数据 |
| `Tag` / `SongTag` | TYPE + STYLE 标签 |
| `SongScripture` | 歌曲关联经文 |
| `Meeting` / `MeetingSong` | 聚会及选歌顺序（排行榜数据源） |
| `Playlist` / `PlaylistSong` | 独立歌单 |
| `Team` / `TeamMember` / `Message` / `TeamSong` | 团队、聊天、共享歌曲 |
| `User` | 四角色 RBAC |

Schema：`prisma/schema.prisma`

## 功能模块速查

| 模块 | 路由 | 关键 lib |
|------|------|----------|
| 曲库 | `/songs`, `/song-upload` | `song-title-index`, `song-title-initial-sync`, `song-title-normalize`, `tags` |
| 主领选歌 | `/sheets`, `/sheets/leaders` | `meeting-theme-search`, `scripture-recommendations`, `sheet-pdf-merge`, `leader-songs` |
| 聚会 | `/meetings` | `leader-names` |
| 歌单 | `/playlists` | `playlist-access` |
| PPT | `/ppt` | `ppt-lyrics`, `ppt-download-client` |
| Agent | 全局 + sheets 嵌入式 | `lib/ai/song-agent-prompt`, `song-agent-tools`, `song-search` |
| OCR | 上传/详情自动触发 | `lyrics-ocr`, `gemini-lyrics`, `openai-lyrics` |
| 分享 | `/share/[type]/[id]` | token 校验，type: song/meeting/playlist |
| 数据 | `/data` | `excel-import` |

完整 API 列表与文件映射 → [features.md](features.md)

## 开发工作流

### 1. 定位改动范围

```
改纯函数/算法     → src/lib/ + tests/lib/
改 HTTP 行为      → src/app/api/ + tests/api/
改 UI             → src/app/(main)/ 或 src/components/
改 Schema         → prisma/schema.prisma + migrate + 更新 mock-prisma
改文案            → src/messages/en.json + zh.json
改侧栏/指南       → nav-items.ts / feature-guide.ts
```

### 2. 测试（必须）

```ts
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
// 用 jsonRequest + readJson 调用 route handler
```

规则见 `.cursor/rules/testing.mdc`。完成前：`pnpm test`

### 3. Schema / 首字母注意

- 新增 Song 字段后：`prisma generate`，开发服务器需重启
- `titleInitial` 不匹配时 API 有降级（按 title 排序）；正常路径需 `db push` + generate
- 批量补全：`pnpm sync-song-initials`
- 去重清理：`pnpm dedupe-songs [--apply]`

### 4. 新功能文档

- 用户向：`README.md`、`docs/帮助文档.md`
- 设计向：`docs/superpowers/specs/YYYY-MM-DD-*.md`
- 功能指南卡片：`feature-guide.ts` + i18n `guide.features.*`

## 权限要点

| 能力 | LEADER+ | ADMIN+ | SUPER_ADMIN |
|------|---------|--------|-------------|
| 上传/编辑歌曲、聚会 | ✅ | ✅ | ✅ |
| 删除歌曲/聚会 | ❌ | ✅ | ✅ |
| 导入数据 | ✅ | ✅ | ✅ |
| 管理标签 | ✅ | ✅ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |

客户端：`usePermissions()`；服务端：`requirePermission()` / `getCurrentUser()`

## 环境变量（常见）

| 变量组 | 用途 |
|--------|------|
| `DATABASE_URL` | PostgreSQL |
| `NEXTAUTH_*` | 认证 |
| `NEXT_PUBLIC_APP_URL` | 分享链接 |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | 选歌 Agent |
| `GEMINI_*` / `LYRICS_OCR_*` | 歌谱 OCR |
| `SMTP_*` | 注册邮箱验证码 |

## 规格文档索引

| 主题 | 文件 |
|------|------|
| i18n | `docs/superpowers/specs/2026-07-17-i18n-en-zh-design.md` |
| 歌曲元数据 | `2026-07-17-song-metadata-fields-design.md` |
| 聚会选歌 | `2026-07-17-meeting-song-search-design.md` |
| 歌词/OCR/LRC | `2026-08-04-lyrics-lrc-ocr-search-design.md` |
| 歌单/标签/分享 | `2026-08-04-playlists-tags-share-design.md` |
| 选歌 Agent | `2026-08-04-song-selection-agent-design.md` |
| 关联经文 | `2026-08-04-song-scripture-design.md` |

## 延伸阅读

- [architecture.md](architecture.md) — 目录结构、数据流、部署
- [features.md](features.md) — 全功能点与 API/lib 对照表
- [development.md](development.md) — 编码约定、测试模式、常见陷阱
- [AGENTS.md](../../AGENTS.md) — 根目录 Agent 速查
