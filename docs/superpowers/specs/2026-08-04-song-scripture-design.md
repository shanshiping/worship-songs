# Song Scripture Association

**Date:** 2026-08-04  
**Status:** Approved  
**Related:** Song metadata (upload / edit / detail / share), `GET /api/songs` search

## Summary

Add multi-entry scripture association on songs: free-text reference plus optional verse body. Edit on upload/edit; show on detail and share; fold reference into existing song list search.

## Decisions

| Decision | Choice |
|----------|--------|
| Shape | Reference + optional text per entry |
| Cardinality | Multiple per song |
| Reference input | Free text (no book/chapter picker) |
| Storage | `SongScripture` relation table |
| Search | Extend existing `?search=` to match `reference` (not body) |
| Share page | Show reference + text |
| Permissions | Same as song create/edit |
| New API routes | None — nest under song POST/PUT |

## Data model

```prisma
model SongScripture {
  id        String @id @default(cuid())
  songId    String
  reference String
  text      String?
  order     Int

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@unique([songId, order])
}
```

`Song` gains `scriptures SongScripture[]`.

Validation:

- `reference` required after trim; empty → 400 if present in payload as blank entry, or drop empty rows client-side before submit (server rejects any item with empty `reference`)
- `text` optional; empty string → `null`
- `order` = array index (0-based)
- No bible-format validation

## API

### Write (`POST /api/songs`, `PUT /api/songs/[id]`)

Body field:

```json
"scriptures": [
  { "reference": "约翰福音 3:16", "text": "神爱世人……" },
  { "reference": "诗篇 23:1" }
]
```

- Create: omit or `[]` → no rows
- Update: like `tagIds` — always replace (`deleteMany` + recreate in order). Omit or non-array → treat as `[]` (clears all). Full song edit forms always send the current array
- Client should omit rows with blank `reference` before submit; server returns 400 if any sent item has blank `reference`

### Read

Include on list, detail, and share song payloads:

```ts
scriptures: { orderBy: { order: 'asc' } }
```

### Search

Existing `GET /api/songs?search=` `OR` adds:

```ts
{ scriptures: { some: { reference: { contains: search, mode: 'insensitive' } } } }
```

Verse `text` is not searched in v1.

## UI

### Upload / edit

Section「关联经文」: dynamic list. Each row: reference `Input` (required) + text `Textarea` (optional). Add / remove rows. Submit as `scriptures`.

### Song detail

If any scriptures: block near composer / notes. Each entry: emphasized reference, then optional body. Hide section when empty.

### Songs list

Reuse search box (no new filter control). Optionally show first reference as muted secondary line on cards when present.

### Share (song)

Show reference + text, styled similarly to detail.

### i18n

Add keys in `en.json` / `zh.json` for labels, placeholders, add/remove actions, empty states.

## Testing

- API: create/update with scriptures; replace on PUT; search by reference; GET includes ordered scriptures
- Share GET includes scriptures
- No E2E required unless explicitly requested

## Out of scope

- Structured book/chapter/verse picker
- Bible version library or auto-fetch verse text
- Search by verse body
- Meeting/Excel import mapping into scriptures
- Drag-and-drop reorder (array order is enough)
- Dedicated scripture filter chip UI
