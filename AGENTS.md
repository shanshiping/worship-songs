# worship-songs — Agent 指南

敬拜选歌平台：Next.js 16 全栈单体，PostgreSQL + Prisma，中英双语 UI。

## 开始工作前

1. **加载项目 Skill**：`.cursor/skills/worship-songs/SKILL.md`（架构、功能地图、开发约定）
2. **改 API / lib 必测**：遵守 `.cursor/rules/testing.mdc`，完成前运行 `pnpm test`
3. **查规格**：新功能或重构前先读 `docs/superpowers/specs/` 对应设计文档
4. **用户文档**：功能说明以 `README.md`、`docs/帮助文档.md` 为准

## 技术栈速览

| 层 | 技术 |
|----|------|
| 前端 | Next.js App Router、React 19、shadcn/ui、Tailwind |
| 后端 | Next.js API Routes、`src/lib/*` 领域逻辑 |
| 数据 | PostgreSQL、Prisma 7 |
| 认证 | NextAuth.js，四角色 RBAC |
| i18n | `I18nProvider` + `src/messages/{en,zh}.json`，Cookie `locale`，无 URL 前缀 |
| 测试 | Vitest + Mock Prisma（`tests/helpers/mock-prisma.ts`） |
| AI | 选歌 Agent（`AI_*`）、歌谱 OCR（`GEMINI_*` / `LYRICS_OCR_*`） |

## 模块 → 路径速查

| 模块 | 页面 | 核心 lib / API |
|------|------|----------------|
| 仪表盘 | `/dashboard` | `api/dashboard` |
| 曲库 | `/songs`, `/song-upload` | `api/songs`, `api/songs/letters`, `song-title-*` |
| 主领选歌 | `/sheets` | `meeting-theme-search`, `scripture-recommendations`, `sheet-pdf-merge` |
| 聚会 | `/meetings`, `/meetings/leaders` | `api/meetings`, `leader-songs`, `leader-names` |
| 歌单 | `/playlists` | `playlist-access`, `api/playlists` |
| 歌词 PPT | `/ppt` | `ppt-lyrics`, `api/songs/ppt` |
| 排行榜 | `/leaderboard` | `api/leaderboard` |
| 分享 | `/share/[type]/[id]` | `api/share` |
| 团队 | `/teams` | `api/teams/*` |
| 选歌 Agent | 全局浮动 + `/sheets` 嵌入式 | `lib/ai/song-agent-*`, `api/agent/chat` |
| 数据 | `/data` | `excel-import`, `api/import`, `api/export` |
| 功能指南 | `/guide` | `feature-guide.ts` |

完整映射见 [`.cursor/skills/worship-songs/features.md`](.cursor/skills/worship-songs/features.md)。

## 开发检查清单

```
- [ ] 行为变更已加/更新 tests/
- [ ] 新 API 路由有 tests/api/*.test.ts
- [ ] UI 文案同时更新 en.json 与 zh.json
- [ ] Schema 变更：prisma migrate / db push + prisma generate
- [ ] 首字母字段：必要时 pnpm sync-song-initials
- [ ] pnpm test 全绿后再声称完成
```

## 常用命令

```bash
pnpm dev                    # 开发服务器
pnpm test                   # 全量测试
pnpm build                  # 生产构建（含 prisma generate）
pnpm seed                   # 种子数据
pnpm sync-song-initials     # 补全 titleInitial
pnpm dedupe-songs [--apply] # 曲库去重
docker compose up -d        # 本地 Postgres
docker compose -f docker-compose.prod.yml up -d --build  # 生产 Docker
```

## 权限（四角色）

`SUPER_ADMIN` > `ADMIN` > `LEADER` > `MEMBER`

- **MEMBER**：查看、下载、导出
- **LEADER**：+ 上传/编辑歌曲与聚会、创建歌单、导入数据、管理标签
- **ADMIN**：+ 删除歌曲/聚会、编辑任意歌单
- **SUPER_ADMIN**：+ 用户管理（`/admin/users`）

详情：`src/lib/permissions.ts`、`src/lib/server-permissions.ts`

## 扩展功能时的默认模式

1. **纯逻辑** → `src/lib/` + `tests/lib/` 或 `tests/unit/lib/`
2. **HTTP 接口** → `src/app/api/` + `tests/api/`
3. **页面** → `src/app/(main)/` + 复用现有 components
4. **文案** → `src/messages/en.json` + `zh.json`
5. **导航** → `src/lib/nav-items.ts` + i18n `nav.*`
6. **功能指南卡片** → `src/lib/feature-guide.ts` + `guide.features.*`

## 参考文档

- [架构详情](.cursor/skills/worship-songs/architecture.md)
- [功能地图](.cursor/skills/worship-songs/features.md)
- [开发约定](.cursor/skills/worship-songs/development.md)
- [README.md](README.md)
- [帮助文档](docs/帮助文档.md)
- [设计规格](docs/superpowers/specs/)
