# Playlist Create & Add Songs UX

**Date:** 2026-08-04  
**Status:** Approved  
**Related:** [2026-08-04-playlists-tags-share-design.md](./2026-08-04-playlists-tags-share-design.md)

## Summary

Replace the heavy “create playlist + pick all songs + reorder + submit” form with a mainstream music-app flow: create an empty playlist quickly, then add songs from the playlist detail or from the song library / song detail.

## Decisions

| Decision | Choice |
|----------|--------|
| Create UI | Dialog on playlists list (name required, description optional) |
| Add songs (from playlist) | Dialog on playlist detail; add is immediate |
| Add songs (from library) | “加入歌单” on songs list + song detail |
| Create + add in one go | From “加入歌单” dialog, allow create new then append song |
| Reorder / remove | On playlist detail; immediate |
| Edit metadata | Inline or small dialog on detail |
| `/playlists/new` | Remove |
| `/playlists/[id]/edit` | Remove heavy song-picker page; metadata edit lives on detail |
| Permissions | Unchanged (create LEADER+; edit/delete creator or ADMIN+) |

## User flows

### Create playlist

1. User clicks 新建 on `/playlists`
2. Dialog: title (required), description (optional)
3. `POST /api/playlists` with empty or omitted `songIds`
4. Navigate to `/playlists/[id]`

### Add songs from playlist detail

1. Empty state or toolbar: 添加歌曲
2. Dialog: search + TYPE/STYLE tag filters + song results
3. Tap + → `POST /api/playlists/[id]/songs` `{ songId }` → list refreshes
4. Already-in-playlist songs shown as added / disabled

### Reorder / remove on detail

1. Move up/down → `PUT /api/playlists/[id]` with full ordered `songIds` (and current title/description), or dedicated reorder if added later
2. Remove → `DELETE /api/playlists/[id]/songs/[songId]` → renumber remaining

### Add to playlist from song library / detail

1. Songs list row action or song detail button: 加入歌单
2. Dialog lists playlists the user can edit
3. Select playlist → append song via `POST .../songs`
4. Footer: 新建歌单 → create dialog → create then append current song → optional navigate to playlist

## API

Keep existing:

- `GET/POST /api/playlists`
- `GET/PUT/DELETE /api/playlists/[id]` (PUT: metadata + optional full `songIds` replace for reorder)

Add:

- `POST /api/playlists/[id]/songs` — body `{ songId }`; append at end; 409 or no-op if duplicate
- `DELETE /api/playlists/[id]/songs/[songId]` — remove and compact `order`

ACL: same as playlist edit (creator or ADMIN / SUPER_ADMIN; requires `PLAYLIST_EDIT`).

## UI components

- `CreatePlaylistDialog`
- `AddSongsToPlaylistDialog` (playlist-scoped search/add)
- `AddToPlaylistDialog` (song-scoped pick playlist / create)

## Out of scope

- Drag-and-drop reorder (up/down buttons are enough for v1)
- Playlist cover image
- Collaborative editing
- Changing share / tag models
