# Lyrics LRC + OCR + Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dual lyrics fields (`lyrics` + `lyricsLrc`), dedicated lyrics search, Gemini sheet OCR, and LRC-aware detail playback.

**Architecture:** Add `lyricsLrc` on `Song`. Extend `GET /api/songs` with `lyricsSearch`. New `POST /api/songs/extract-lyrics` reads a sheet file and calls Gemini Vision (mocked in tests). UI: lyrics search box, LRC textarea, extract button with confirm, detail LRC sync.

**Tech Stack:** Prisma/Postgres, Next.js App Router, Gemini REST (`GEMINI_API_KEY`), Vitest + mock Prisma.

## Global Constraints

- Two independent fields; empty → `null` via `normalizeOptional`
- `search` = title/artist; `lyricsSearch` = `lyrics` only; combine with `AND`
- OCR returns text only (no DB write); confirm before overwriting non-empty `lyrics`
- Gemini only (`GEMINI_API_KEY`); no OpenAI fallback
- Share page: plain `lyrics` only
- Out of scope: LRC tap-sync tool, full-text index, auto-LRC from OCR
- Behavior changes to API/lib → matching tests under `tests/`; `pnpm test` green
- No `any`

---

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Add `lyricsLrc String?` |
| `src/lib/lrc.ts` | Parse LRC lines → `{ timeSec, text }[]` |
| `src/lib/gemini-lyrics.ts` | Call Gemini with file bytes + prompt; return plain lyrics |
| `src/app/api/songs/route.ts` | `lyricsSearch`; POST `lyricsLrc` |
| `src/app/api/songs/[id]/route.ts` | PUT `lyricsLrc` |
| `src/app/api/songs/extract-lyrics/route.ts` | Auth + path validate + extract |
| `.env.example` | `GEMINI_API_KEY=` |
| `src/app/(main)/songs/page.tsx` | Lyrics search input |
| `src/app/(main)/songs/upload/page.tsx` | LRC field + extract button |
| `src/app/(main)/songs/[id]/edit/page.tsx` | Same |
| `src/app/(main)/songs/[id]/page.tsx` | LRC follow-along; static plain |
| `src/components/edit-song-tags-dialog.tsx` | Pass through `lyricsLrc` on PUT if needed |
| `src/messages/en.json`, `zh.json` | Copy |
| `tests/api/songs.test.ts` | lyricsSearch + POST lyricsLrc |
| `tests/api/songs-[id].test.ts` | PUT lyricsLrc |
| `tests/api/songs-extract-lyrics.test.ts` | extract-lyrics cases |
| `tests/lib/lrc.test.ts` | LRC parser |

---

### Task 1: Schema + LRC parser + songs search/CRUD API

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/lrc.ts`
- Create: `tests/lib/lrc.test.ts`
- Modify: `src/app/api/songs/route.ts`
- Modify: `src/app/api/songs/[id]/route.ts`
- Modify: `tests/api/songs.test.ts`
- Modify: `tests/api/songs-[id].test.ts`

**Interfaces:**
- Produces:

```ts
// src/lib/lrc.ts
export type LrcLine = { timeSec: number; text: string }
export function parseLrc(source: string): LrcLine[]
```

- `GET` reads `lyricsSearch` query param.
- When both `search` and `lyricsSearch` (and/or tags): build `where.AND` so OR-search and lyrics filter do not clobber each other.

- [ ] **Step 1: Failing tests for LRC parse + lyricsSearch + lyricsLrc**

`tests/lib/lrc.test.ts`: parse `[00:12.00]Hello` → `{ timeSec: 12, text: 'Hello' }`; ignore non-timestamp lines for timed list (or keep text-only with timeSec -1 — prefer skip lines without timestamps).

`tests/api/songs.test.ts`:

```ts
it('GET filters by lyricsSearch', async () => {
  mockPrisma.song.findMany.mockResolvedValue([])
  mockPrisma.song.count.mockResolvedValue(0)
  await GET(jsonRequest('http://localhost/api/songs?lyricsSearch=哈利路亚'))
  expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        lyrics: { contains: '哈利路亚', mode: 'insensitive' },
      },
    })
  )
})

it('GET combines search and lyricsSearch with AND', async () => {
  mockPrisma.song.findMany.mockResolvedValue([])
  mockPrisma.song.count.mockResolvedValue(0)
  await GET(jsonRequest('http://localhost/api/songs?search=Praise&lyricsSearch=holy'))
  expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: 'Praise', mode: 'insensitive' } },
              { artist: { contains: 'Praise', mode: 'insensitive' } },
            ],
          },
          { lyrics: { contains: 'holy', mode: 'insensitive' } },
        ],
      },
    })
  )
})

it('POST saves lyricsLrc', async () => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
  mockPrisma.song.create.mockResolvedValue({ id: 's1', title: 'T', tags: [] })
  await POST(jsonRequest('http://localhost/api/songs', {
    method: 'POST',
    body: { title: 'T', lyricsLrc: '[00:01.00]Hi' },
  }))
  expect(mockPrisma.song.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ lyricsLrc: '[00:01.00]Hi' }),
    })
  )
})
```

Add PUT clear/save `lyricsLrc` in `tests/api/songs-[id].test.ts` similarly.

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm test tests/lib/lrc.test.ts tests/api/songs.test.ts tests/api/songs-[id].test.ts`

- [ ] **Step 3: Implement schema + parser + API**

Add `lyricsLrc String?` after `lyrics` in schema. Run `pnpm exec prisma generate` (and `db push` if local DB available).

`parseLrc`: match `/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/` per line; `timeSec = mm*60 + ss + ms/1000`.

GET where-building: collect conditions in `AND` array (tags, search-OR object, lyrics contains).

POST/PUT: `lyricsLrc: normalizeOptional(lyricsLrc)`.

- [ ] **Step 4: Tests pass + commit**

```bash
pnpm test tests/lib/lrc.test.ts tests/api/songs.test.ts tests/api/songs-[id].test.ts
git add prisma/schema.prisma src/lib/lrc.ts src/app/api/songs/route.ts src/app/api/songs/[id]/route.ts tests/
git commit -m "feat: add lyricsLrc field and lyricsSearch filter"
```

---

### Task 2: Gemini extract-lyrics API

**Files:**
- Create: `src/lib/gemini-lyrics.ts`
- Create: `src/app/api/songs/extract-lyrics/route.ts`
- Create: `tests/api/songs-extract-lyrics.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:

```ts
// src/lib/gemini-lyrics.ts
export async function extractLyricsFromSheet(params: {
  bytes: Buffer
  mimeType: string
  apiKey: string
}): Promise<string>

// POST /api/songs/extract-lyrics body: { path: string }
// 200: { lyrics: string }
```

- Path must match `/uploads/sheets/<filename>` only (no `..`); resolve under `public/uploads/sheets`.
- Mime from extension: `.pdf` → `application/pdf`; images accordingly.

- [ ] **Step 1: Failing route tests**

Mock `getServerSession`, mock `fs/promises.readFile`, mock `@/lib/gemini-lyrics`.

Cases: 401 no session; 503 no `GEMINI_API_KEY`; 400 bad path (`../etc/passwd`); 200 returns lyrics and does not call prisma.

- [ ] **Step 2: Implement lib + route**

Gemini REST: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`

Body: `contents[0].parts` = `{ inline_data: { mime_type, data: base64 } }` + text prompt (extract lyric lines only…).

- [ ] **Step 3: Tests pass + commit**

```bash
pnpm test tests/api/songs-extract-lyrics.test.ts
git commit -m "feat: extract lyrics from sheet via Gemini"
```

---

### Task 3: UI — list search, upload/edit, detail LRC

**Files:**
- Modify: `src/app/(main)/songs/page.tsx`
- Modify: `src/app/(main)/songs/upload/page.tsx`
- Modify: `src/app/(main)/songs/[id]/edit/page.tsx`
- Modify: `src/app/(main)/songs/[id]/page.tsx`
- Modify: `src/components/edit-song-tags-dialog.tsx` (include `lyricsLrc` in PUT body if song type includes it)
- Modify: `src/messages/en.json`, `zh.json`

- [ ] **Step 1: i18n keys**

Add: `searchLyricsPlaceholder`, `lyricsLrc`, `lyricsLrcPlaceholder`, `extractFromSheet`, `extractConfirmOverwrite`, `extractingLyrics`, `extractFailed`, etc. (en + zh).

- [ ] **Step 2: Songs list**

`lyricsSearch` state; append to fetch params; second input next to existing search.

- [ ] **Step 3: Upload + edit forms**

- `lyricsLrc` in form state and submit body.
- Extract button when sheet path set: call `/api/songs/extract-lyrics`; if `lyrics` trim non-empty, `window.confirm` before set.

- [ ] **Step 4: Detail page**

- Prefer `lyricsLrc` + `parseLrc` for highlight/scroll from `currentTime`.
- Else static `lyrics` lines (no average-time fake highlight).
- If both: LRC panel primary; plain text secondary section.

- [ ] **Step 5: `pnpm test` + commit**

```bash
pnpm test
git commit -m "feat: lyrics search UI, LRC edit, sheet OCR, timed lyrics"
```

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| `lyricsLrc` field | 1 |
| `lyricsSearch` AND with search/tags | 1 |
| POST/PUT `lyricsLrc` | 1 |
| extract-lyrics + Gemini + env | 2 |
| List lyrics search UI | 3 |
| Upload/edit LRC + extract confirm | 3 |
| Detail LRC / static plain | 3 |
| Share plain only | already; no LRC required on share |
| Tests listed in spec | 1–2 |
