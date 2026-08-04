# Song Scripture Association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let songs store multiple free-text scripture references (optional verse body), edit them on upload/edit, show on detail/share, and match references via existing song list search.

**Architecture:** Add `SongScripture` relation; nest create/replace under `POST/PUT /api/songs`; include ordered scriptures on reads; extend `?search=` OR to `scriptures.reference`. UI: dynamic list on upload/edit; display blocks on detail, list card, share.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Vitest + mock Prisma, existing shadcn + next-intl messages.

## Global Constraints

- Behavior changes to API require `tests/api/*.test.ts`; finish with `pnpm test` green
- No `any`
- No bible picker / auto-fetch / body search / import mapping (YAGNI)
- Preserve existing WIP song fields (`lyricsLrc`, `lyricsSearch`, uploader metadata) when editing those files
- PUT `scriptures` like `tagIds`: omit/non-array → `[]` (clear all)

---

## File map

| File | Role |
|------|------|
| `prisma/schema.prisma` | `SongScripture` + `Song.scriptures` |
| `tests/helpers/mock-prisma.ts` | `songScripture` model mock |
| `src/app/api/songs/route.ts` | `parseScriptures`, include, search OR, POST create |
| `src/app/api/songs/[id]/route.ts` | include, PUT replace, DELETE cleanup |
| `src/app/api/share/route.ts` | include scriptures on song (+ playlist songs) |
| `tests/api/songs.test.ts` | search + POST scriptures |
| `tests/api/songs-[id].test.ts` | PUT replace / clear / 400 |
| `tests/api/share.test.ts` | GET includes scriptures (if covered) |
| `src/components/song-scriptures-editor.tsx` | reusable add/remove rows |
| `src/app/(main)/songs/upload/page.tsx` | wire editor |
| `src/app/(main)/songs/[id]/edit/page.tsx` | wire editor |
| `src/app/(main)/songs/[id]/page.tsx` | display block |
| `src/app/(main)/songs/page.tsx` | optional first reference on cards |
| `src/app/share/[type]/[id]/page.tsx` | display on shared song |
| `src/messages/en.json`, `zh.json` | i18n keys |

---

### Task 1: Schema + mock

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `tests/helpers/mock-prisma.ts`

- [ ] **Step 1: Add model to schema**

On `Song`, add `scriptures SongScripture[]`.

Add:

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

- [ ] **Step 2: Add `songScripture: model()` to `PrismaMock` and `mockPrisma`**

- [ ] **Step 3: Run `pnpm exec prisma generate`** (and `db push` / migrate if local DB available)

---

### Task 2: API parse + songs list/create (TDD)

**Files:**
- Test: `tests/api/songs.test.ts`
- Modify: `src/app/api/songs/route.ts`

**Interfaces:**
- Produces: `parseScriptures(value: unknown): { ok: true; data: { reference: string; text: string | null }[] } | { ok: false; error: string }`
- Produces: `scripturesInclude = { orderBy: { order: 'asc' as const } }`
- Search OR gains `{ scriptures: { some: { reference: { contains: search, mode: 'insensitive' } } } }`

- [ ] **Step 1: Write failing tests**

Update existing search expectations to include scripture OR where `search` is set.

Add:

```ts
it('GET search also matches scripture reference', async () => {
  mockPrisma.song.findMany.mockResolvedValue([])
  mockPrisma.song.count.mockResolvedValue(0)
  await GET(jsonRequest('http://localhost/api/songs?search=诗篇'))
  expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        // either top-level OR or nested inside AND[0].OR depending on lyricsSearch
      }),
    })
  )
  const call = mockPrisma.song.findMany.mock.calls[0][0]
  const or =
    call.where.OR ??
    call.where.AND?.find((c: { OR?: unknown }) => c.OR)?.OR
  expect(or).toEqual(
    expect.arrayContaining([
      {
        scriptures: {
          some: { reference: { contains: '诗篇', mode: 'insensitive' } },
        },
      },
    ])
  )
})

it('POST creates scriptures', async () => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
  mockPrisma.song.create.mockResolvedValue({ id: 's1', title: 'T', tags: [], scriptures: [] })
  await POST(
    jsonRequest('http://localhost/api/songs', {
      method: 'POST',
      body: {
        title: 'T',
        scriptures: [
          { reference: '约翰福音 3:16', text: '神爱世人' },
          { reference: '诗篇 23:1' },
        ],
      },
    })
  )
  expect(mockPrisma.song.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        scriptures: {
          create: [
            { reference: '约翰福音 3:16', text: '神爱世人', order: 0 },
            { reference: '诗篇 23:1', text: null, order: 1 },
          ],
        },
      }),
    })
  )
})

it('POST returns 400 for blank scripture reference', async () => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
  const res = await POST(
    jsonRequest('http://localhost/api/songs', {
      method: 'POST',
      body: { title: 'T', scriptures: [{ reference: '  ' }] },
    })
  )
  expect((await readJson(res)).status).toBe(400)
})
```

Also update `GET combines search and lyricsSearch` expected OR to include scripture clause.

- [ ] **Step 2: Run tests — expect FAIL**

`pnpm exec vitest run tests/api/songs.test.ts`

- [ ] **Step 3: Implement in `route.ts`**

- Export `parseScriptures`
- Add `scriptures: { orderBy: { order: 'asc' } }` to `songDetailInclude`
- Extend search OR
- POST: parse; on failure 400; nest `scriptures: { create: [...] }` when non-empty

- [ ] **Step 4: Run tests — expect PASS**

---

### Task 3: Song [id] PUT/GET/DELETE (TDD)

**Files:**
- Test: `tests/api/songs-[id].test.ts`
- Modify: `src/app/api/songs/[id]/route.ts`

- [ ] **Step 1: Failing tests for PUT replace, clear, 400; GET include uses scriptures order**

```ts
it('PUT replaces scriptures', async () => {
  mockPrisma.song.findUnique.mockResolvedValue({ sheetMusic: null })
  mockPrisma.songTag.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.songScripture.deleteMany.mockResolvedValue({ count: 1 })
  mockPrisma.song.update.mockResolvedValue({ id: 'song-1', scriptures: [] })

  const res = await PUT(
    jsonRequest('http://localhost/api/songs/song-1', {
      method: 'PUT',
      body: {
        title: '神掌权',
        tagIds: [],
        scriptures: [{ reference: '诗篇 23:1', text: '耶和华是我的牧者' }],
      },
    }),
    params
  )
  expect((await readJson(res)).status).toBe(200)
  expect(mockPrisma.songScripture.deleteMany).toHaveBeenCalledWith({
    where: { songId: 'song-1' },
  })
  expect(mockPrisma.song.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        scriptures: {
          create: [
            { reference: '诗篇 23:1', text: '耶和华是我的牧者', order: 0 },
          ],
        },
      }),
    })
  )
})
```

Also: omit `scriptures` → deleteMany + create `[]`; blank reference → 400; DELETE calls `songScripture.deleteMany`.

Update existing PUT tests to mock `songScripture.deleteMany`.

- [ ] **Step 2: Implement** — import `parseScriptures`; include scriptures; replace on PUT; deleteMany on DELETE

- [ ] **Step 3: `pnpm exec vitest run tests/api/songs-[id].test.ts` PASS**

---

### Task 4: Share include

**Files:**
- Modify: `src/app/api/share/route.ts` — add `scriptures: { orderBy: { order: 'asc' } }` to `fullSongInclude`
- Test: extend `tests/api/share.test.ts` if it asserts include shape; otherwise skip

---

### Task 5: UI + i18n

**Files:**
- Create: `src/components/song-scriptures-editor.tsx`
- Modify: upload, edit, detail, list, share pages
- Modify: `en.json` / `zh.json`

Editor props:

```ts
type ScriptureDraft = { reference: string; text: string }
props: {
  value: ScriptureDraft[]
  onChange: (next: ScriptureDraft[]) => void
}
```

- Filter blank-reference rows before submit
- Detail/share: map `scriptures` ordered; show reference + optional text
- List: if `song.scriptures?.[0]?.reference`, muted line under artist

i18n keys under `songs.*`:
- `scriptures`, `scriptureReference`, `scriptureReferencePlaceholder`
- `scriptureText`, `scriptureTextPlaceholder`
- `addScripture`, `removeScripture`

---

### Task 6: Verify

- [ ] `pnpm test` all green
- [ ] Manual smoke: upload with 2 scriptures → detail → search by reference → share page

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| SongScripture model | 1 |
| POST/PUT scriptures replace | 2–3 |
| Search by reference | 2 |
| Include on list/detail/share | 2–4 |
| Upload/edit UI | 5 |
| Detail/list/share display | 5 |
| i18n | 5 |
| API tests | 2–3 |
| Out of scope items | not implemented |
