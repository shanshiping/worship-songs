# Quick Tag Select UX

**Date:** 2026-08-04  
**Status:** Approved  
**Related:** [2026-08-04-playlists-tags-share-design.md](./2026-08-04-playlists-tags-share-design.md)

## Summary

Make TYPE/STYLE tags faster to use: edit tags from the song detail cover (editors only), and filter the songs list by clicking a song’s tag badges.

## Decisions

| Decision | Choice |
|----------|--------|
| Approach | Dialog on detail cover; badge click filters list |
| List badge click | Toggle filter only (does not edit the song) |
| Uncategorized badge | Clears type + style filters |
| Permissions | Cover edit requires `canEditSong`; list filter is open to all |
| API | Reuse `GET /api/tags`, `PUT /api/songs/[id]` — no new routes |
| Share page | Out of scope (badges remain display-only) |

## Song detail — edit tags from cover

1. When `canEditSong`, the gradient cover region is clickable (cursor + short hint e.g. “编辑标签”).
2. Opens a Dialog with TYPE and STYLE `TagMultiSelect`, prefilled from current `song.tags`.
3. Save sends `PUT /api/songs/[id]` with existing song fields plus updated `tagIds`.
4. On success: toast, close dialog, refresh song so cover color and header badges update.
5. Without edit permission, cover is display-only.

## Songs list — filter from badges

1. Extend `SongTagBadges` with optional `onTagClick?: (tag: TagItem) => void`.
2. When provided, each badge is a button; `stopPropagation` so card/row links do not navigate.
3. TYPE badge → toggle id in `selectedTypeIds`; STYLE → toggle in `selectedStyleIds`; reset `page` to 1.
4. “未分类” click → clear both filter arrays.
5. Existing filter-row `TagMultiSelect` stays and shares the same state (stays in sync).

## UI pieces

- `SongTagBadges` — optional click handler
- `EditSongTagsDialog` (or inline dialog on detail page) — TagMultiSelect + save
- Wire: `src/app/(main)/songs/[id]/page.tsx`, `src/app/(main)/songs/page.tsx`

## Out of scope

- Inline tag editing on the list
- Popover instead of Dialog
- Changing share page behavior
- New API endpoints
- Drag-and-drop or custom tag creation
