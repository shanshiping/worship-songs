# Lyrics Plain Text + LRC + Sheet OCR + Lyrics Search

**Date:** 2026-08-04  
**Status:** Approved

## Summary

Keep plain-text lyrics for editing and search; add optional LRC for timed karaoke; extract lyrics from sheet images/PDFs via Gemini Vision (user confirms before overwrite); add a dedicated lyrics search box on the songs list (separate from title/artist search).

## Decisions

| Decision | Choice |
|----------|--------|
| Storage | Two fields: `lyrics` (plain) + `lyricsLrc` (optional LRC) |
| Field independence | Editing one does not auto-update the other |
| List search | Existing `search` = title/artist; new `lyricsSearch` = `lyrics` only; combine with `AND` |
| OCR engine | Gemini Vision (`GEMINI_API_KEY`); no OpenAI fallback this phase |
| OCR write behavior | API returns text only; UI fills form; confirm before overwriting non-empty `lyrics` |
| Detail playback | Prefer LRC timed highlight when present; plain text static (no fake average-time highlight) |
| Share page | Show plain text only (no player → no LRC sync) |
| Out of scope | LRC tap-to-sync tool, Postgres full-text index, auto-LRC from OCR |

## Data model

On `Song`:

| Field | Type | Role |
|-------|------|------|
| `lyrics` | `String?` (existing) | Plain lyrics; OCR + manual edit; lyrics search target |
| `lyricsLrc` | `String?` (new) | Optional LRC (`[mm:ss.xx]text`); timed follow-along |

- Empty strings normalized to `null` via existing `normalizeOptional`.
- No migration of existing `lyrics` values.

## API

### Songs CRUD

- `POST /api/songs` and `PUT /api/songs/[id]`: accept optional `lyricsLrc`.
- Share payload includes `lyricsLrc` when present.

### Songs list `GET /api/songs`

| Param | Behavior |
|-------|----------|
| `search` | Unchanged: `title` OR `artist` (`contains`, `insensitive`) |
| `lyricsSearch` | New: `lyrics` only (`contains`, `insensitive`) |
| Both | Combined with `AND` (also with existing `tagIds` filters) |

### Extract lyrics `POST /api/songs/extract-lyrics`

- Auth required.
- Body: `{ path: string }` — uploaded sheet path under `/uploads/sheets/...`.
- Supported: jpg/png/webp/gif/pdf (same as sheet upload).
- Server reads local file → Gemini Vision → returns `{ lyrics: string }`.
- Does **not** persist to DB.
- Prompt: extract lyric lines only; strip notation, chords, headers/footers; plain text, one line per lyric line.
- Errors: 401 unauthenticated; 503 missing `GEMINI_API_KEY`; 4xx missing/invalid path or unsupported type; 500/502 on provider failure with clear message.

### Config

- `.env.example`: add `GEMINI_API_KEY=`.

## UI

### Songs list `/songs`

- Keep title/artist search.
- Add adjacent “search lyrics” input bound to `lyricsSearch`.
- i18n (en/zh) for placeholders and labels.

### Upload / edit

- Keep large plain `lyrics` textarea.
- Add optional `lyricsLrc` textarea with format example placeholder.
- When sheet path exists: “Extract from sheet” button → loading → `extract-lyrics` → fill `lyrics`.
- If `lyrics` already non-empty: confirm before overwrite.
- Line-count hint remains for plain text only.

### Song detail

- If `lyricsLrc`: parse timestamps; highlight/scroll by audio `currentTime`.
- If only `lyrics`: static display; remove average-duration fake highlight.
- If both: LRC for follow-along; plain text as secondary/fallback display.

### Share

- Display plain `lyrics` only.

## Testing

Vitest with mocked Prisma and Vision client:

1. `GET /api/songs`: `lyricsSearch` filters on `lyrics`; combines with `search` / `tagIds` via `AND`.
2. `POST`/`PUT`: save and clear `lyricsLrc`.
3. `POST /api/songs/extract-lyrics`: 401 / 503 / invalid path; success returns `{ lyrics }` without DB write.

## Success criteria

1. Plain lyrics and LRC can be saved independently.
2. List finds songs by lyric snippet via the dedicated lyrics search box.
3. With sheet + API key, extract fills plain lyrics after user confirm when needed.
4. Detail uses LRC timing when present; plain-only songs show static lyrics.
