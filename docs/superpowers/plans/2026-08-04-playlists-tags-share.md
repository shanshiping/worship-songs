# 歌单、标签与分享 Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans task-by-task. Steps use checkbox tracking in the saved plan doc.

**Goal:** 支持按类型/风格多选标签选歌，创建可复用歌单，并一键分享含完整歌曲信息的公开链接。

**Architecture:** 用 `Tag` + `SongTag` 替代 `Category`；新增 `Playlist` + `PlaylistSong`；扩展现有 `/api/share` 与 `ShareButton` 支持 `playlist`，公开页返回完整歌曲字段。权限：LEADER+ 可建歌单；仅创建者或 ADMIN/SUPER_ADMIN 可改删。

**Tech Stack:** Next.js App Router、Prisma/PostgreSQL、Vitest（mock Prisma）、现有 shadcn UI / i18n。

**Global constraints:**
- 行为变更必须有 `tests/api/*.test.ts`，完成前 `pnpm test` 全绿
- 禁止 `any`（见 `.cursor/rules/no-any.mdc`）
- 第一版不做自定义标签 CRUD UI；标签由 seed 固定
- 不重构既有 share token 落库；与现状同级

---

## Data model

在 `prisma/schema.prisma`：

- 新增 `Tag`（`name`, `kind: TYPE|STYLE`, `@@unique([name, kind])`）、`SongTag`
- 新增 `Playlist`（`title`, `description?`, `createdById` → User）、`PlaylistSong`（`order`）
- 从 `Song` 移除 `categoryId`；删除 `Category` model
- Seed：12 个 TYPE + 3 个 STYLE；迁移重叠分类名到 TYPE 标签

## API surface

| Route | Behavior |
|-------|----------|
| `GET /api/tags?kind=` | 列标签 |
| `GET/POST /api/songs` | `tagIds` 读写；列表按 `tagIds` **AND** 筛选 |
| `GET/PUT/DELETE /api/songs/[id]` | include tags；PUT 同步 `SongTag` |
| `GET/POST /api/playlists` | 列表/创建（`songIds` 有序）；需 `PLAYLIST_CREATE` |
| `GET/PUT/DELETE /api/playlists/[id]` | 详情含完整歌曲；改删校验创建者或 ADMIN+ |
| `POST/GET /api/share` | `type=playlist`；GET 返回歌单 + 有序歌曲完整字段 |
| 移除 | `/api/categories*` |

## Implementation order

1. Spec/plan 文档落盘 → schema + seed + 迁移
2. Tags API + Songs 标签读写/筛选（TDD）
3. Playlists API + 权限（TDD）
4. Share playlist 完整字段（TDD）
5. UI：歌曲筛选/编辑、歌单页、导航、分享页
6. 清理 Category API/UI 引用；i18n；全量测试
