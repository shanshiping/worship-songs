# Playlists, Tags & Share Design

**Date:** 2026-08-04  
**Status:** Approved

## Summary

Replace single-select `Category` with multi-select `Tag` (TYPE + STYLE). Add standalone shareable `Playlist` independent of `Meeting`. One-click share of a playlist returns full song details on the public page.

## Decisions

| Decision | Choice |
|----------|--------|
| Playlist vs Meeting | Independent playlists; meetings unchanged |
| Type cardinality | Multi-select |
| Style cardinality | Multi-select |
| Tag model | Unified `Tag` with `kind: TYPE \| STYLE` |
| Custom tags UI | Out of scope (seed only) |
| Share payload | Full song info (lyrics, sheet, audio, metadata, tags) |
| Playlist edit ACL | Creator only, or ADMIN / SUPER_ADMIN |
| Playlist create | LEADER / ADMIN / SUPER_ADMIN |
| Share token storage | Unchanged (not persisted) |

## Data model

- `Tag { id, name, kind }` with `@@unique([name, kind])`
- `SongTag { songId, tagId }`
- `Playlist { id, title, description?, createdById, timestamps }`
- `PlaylistSong { playlistId, songId, order }`
- Remove `Song.categoryId` and `Category`

### Seed TYPE tags

宣教诗歌, 主日敬拜, 福音布道, 圣诞诗歌, 复活节诗歌, 儿童诗歌, 信心回应, 敬拜赞美, 认罪悔改, 迦南诗歌, 传统诗歌, 英文诗歌

### Seed STYLE tags

活泼, 忧伤, 激励

### Migration from Category

Map overlapping names (敬拜赞美, 圣诞诗歌, 复活节诗歌) to TYPE tags. Other songs start with no tags.

## API

- `GET /api/tags?kind=`
- Songs list/create/update accept `tagIds`; list filters with AND across selected tags
- `GET/POST /api/playlists`, `GET/PUT/DELETE /api/playlists/[id]`
- Share `type=playlist` returns playlist + ordered full songs
- Category routes removed

## UI

- Songs: multi-filter by type/style; upload/edit multi-select tags
- Playlists: list / new / detail / edit with search + tag filter + order
- Nav: 歌单 `/playlists`
- Share button supports `playlist`
