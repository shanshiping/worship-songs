# Meeting Song Search & Manual Add Design

**Date:** 2026-07-17  
**Status:** Implemented  
**Scope:** New Meeting page song picker — server-side search + manual create when no match

## Problem

On `/meetings/new`, songs were loaded once with `GET /api/songs?limit=100` and filtered in the browser. Songs outside that first page never appeared in search. When the song was not in the library at all, users had no way to add it without leaving the page.

## Goals

- Search the full song library by title / artist (case-insensitive)
- When search returns no matches, allow creating a song inline and attaching it to the meeting
- Keep meeting creation still based on `songIds` (no schema change)

## Non-Goals

- Editing existing songs from the meeting form
- Deduplicating similar titles automatically
- Changing meeting edit flows (only new meeting for now)
- Full-text / fuzzy search beyond Prisma `contains`

## Approach

1. Debounce the search box (~300ms) and call `GET /api/songs?search=…&limit=50`
2. Use PostgreSQL case-insensitive `contains` (`mode: 'insensitive'`) on `title` and `artist`
3. If the query is non-empty and results are empty, show a compact manual-add form (title prefilled, optional artist, required category)
4. Manual add calls existing `POST /api/songs`, then pushes the created song into the selected list

## API

### Search

`GET /api/songs`

| Param | Notes |
|-------|--------|
| `search` | Optional; matches `title` or `artist` with `mode: 'insensitive'` |
| `limit` | Default 20; new meeting uses 50 |
| `page` | Unchanged |

Empty `search` returns the latest page of songs (browse). Non-empty `search` scopes `where` to the OR title/artist filter across the whole table (not limited to a preloaded client cache).

### Manual create

`POST /api/songs` (existing)

Required: `title`, `categoryId`. Optional: `artist` (and other metadata fields unused here).

Auth: session required (unchanged). Created song is immediately selectable via its `id` in `POST /api/meetings` `songIds`.

## UI (`/meetings/new`)

```
Search box
    │
    ├─ results → click to add to selected list
    │
    └─ no results + non-empty query
           → manual form (title / artist / category)
           → POST /api/songs → add to selected list
```

- Show a short “searching…” state while the debounced request is in flight
- Prefill manual title from the current search query when the query changes
- After successful manual add: clear search, reset manual fields, keep the new song in “selected”

## i18n

Keys under `meetings.*` in `en.json` / `zh.json`: `searching`, `noSearchResults`, `manualAddHint`, `manualTitle`, `manualArtist`, `manualArtistPlaceholder`, `manualCategory`, `manualCategoryPlaceholder`, `manualAdd`, `manualAdding`, `manualAddFailed`.

## Data flow (architecture)

```
New Meeting UI
    │  debounced search
    ▼
GET /api/songs?search=…
    │
    ├─ hits → select existing Song.id
    └─ miss → POST /api/songs → new Song.id
    │
    ▼
POST /api/meetings { songIds: [...] }
    │
    ▼
MeetingSong rows → PostgreSQL
```

## Files

| Path | Role |
|------|------|
| `src/app/(main)/meetings/new/page.tsx` | Debounced search UI + manual add form |
| `src/app/api/songs/route.ts` | Insensitive `search` filter |
| `src/messages/en.json` / `zh.json` | Copy for empty / manual states |

## Testing

- [ ] Song beyond the first 100 by `createdAt` is findable by title/artist
- [ ] Case-insensitive match (e.g. `jesus` finds `Jesus`)
- [ ] No-match query shows manual form with title prefilled
- [ ] Manual add creates a library song and lists it under selected songs
- [ ] Creating the meeting persists the manually added song
- [ ] EN / 中文 strings render for the new UI
