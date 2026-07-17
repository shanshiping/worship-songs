# Song Metadata Fields Design

**Date:** 2026-07-17  
**Status:** Approved

## Summary

Extend the `Song` model and song UI with optional metadata fields commonly used for worship songs: musical key, time signature, composer, lyricist, team, album, and MV external URL. Existing fields for lyrics, audio, and sheet music remain unchanged.

## Decisions

| Decision | Choice |
|----------|--------|
| Approach | Add optional columns on `Song` (not a separate meta table, not JSON bag) |
| Team | Free-text string (not linked to `Team`) |
| MV | External URL only (no video file upload) |
| Key / time signature | Preset dropdown + allow custom free text; stored as strings |
| List page | No new columns; full metadata on detail / upload / edit only |
| Import/export | Out of scope for this change |
| Filtering by key/time | Out of scope for this change |

## Gap analysis (before)

| Field | Status |
|-------|--------|
| Lyrics (`lyrics`) | Already exists |
| Audio (`audioFile`) | Already exists |
| Sheet music (`sheetMusic`) | Already exists |
| Artist (`artist`) | Already exists (generic performer/author) |
| Key (调) | Missing |
| Time signature (拍) | Missing |
| Composer (作曲) | Missing |
| Lyricist (作词) | Missing |
| Team (团队) | Missing |
| Album (专辑) | Missing |
| MV | Missing |

## Data model

Add to Prisma `Song`:

| Field | Type | Notes |
|-------|------|--------|
| `key` | `String?` | e.g. `C`, `G`, `Am` |
| `timeSignature` | `String?` | e.g. `4/4`, `3/4`, `6/8` |
| `composer` | `String?` | Composer |
| `lyricist` | `String?` | Lyricist |
| `team` | `String?` | Free-text worship/artist team name |
| `album` | `String?` | Album name |
| `mvUrl` | `String?` | External MV link |

Unchanged: `title`, `artist`, `categoryId`, `sheetMusic`, `audioFile`, `lyrics`, `notes`, timestamps, relations.

Migration: additive nullable columns only — existing rows remain valid.

### Preset suggestions (UI constants, not DB enums)

**Keys (examples):** `C`, `C#`, `Db`, `D`, `Eb`, `E`, `F`, `F#`, `Gb`, `G`, `Ab`, `A`, `Bb`, `B`, plus minor variants such as `Am`, `Em`, `Dm` as needed in the UI list.

**Time signatures (examples):** `4/4`, `3/4`, `2/4`, `6/8`, `12/8`.

Users may type a custom value not in the list; the value is stored as-is.

## API

- `POST /api/songs` and `PUT /api/songs/[id]`: accept optional `key`, `timeSignature`, `composer`, `lyricist`, `team`, `album`, `mvUrl`.
- Empty strings normalize to `null`.
- `mvUrl`: if present and non-empty, must be a valid `http:` or `https:` URL; otherwise return `400` with an error message (client also validates).
- `GET` song detail / list payloads include the new fields when present.

## UI

### Upload & edit

- Form fields for all new metadata.
- Key and time signature: select with presets + custom option / free input.
- MV: text input for URL; optional open-in-new-tab preview when valid.

### Detail

- Show new fields in the song info section when set.
- MV shown as an external link (no embedded player).

### List

- Unchanged columns (title, category, artist, usage, attachments).

### i18n

- Add EN/ZH labels and validation messages under `songs.*` in message catalogs.

## Out of scope

- Excel import/export columns for the new fields
- Filtering/search by key or time signature
- Linking `team` to the collaboration `Team` model
- Uploading MV video files
- Renaming or splitting existing `artist` into stricter roles (keep `artist` as-is alongside composer/lyricist)

## Acceptance

1. Upload and edit can save key, time signature, composer, lyricist, team, album, and MV URL.
2. Key and time signature can be chosen from presets or entered custom.
3. Detail page displays the new fields; MV opens as an external link when set.
4. Existing songs without the new fields still load and edit correctly.
5. Invalid MV URLs are rejected (client toast / API 400) and not persisted.
6. EN and ZH labels exist for the new fields.
