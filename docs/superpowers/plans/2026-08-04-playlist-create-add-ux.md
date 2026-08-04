# Playlist Create & Add Songs UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heavy create/edit playlist forms with Dialog-based create, immediate add/remove/reorder on detail, and “加入歌单” from the song library.

**Architecture:** Keep existing playlist CRUD. Add append/remove song endpoints. UI: three Dialogs (`CreatePlaylistDialog`, `AddSongsToPlaylistDialog`, `AddToPlaylistDialog`) wired into list, detail, and songs pages. Delete `/playlists/new` and `/playlists/[id]/edit`.

**Tech Stack:** Next.js App Router, Prisma (mocked in Vitest), existing Dialog/Button/Input, i18n (`en.json` / `zh.json`).

## Global Constraints

- API/lib behavior changes need matching tests under `tests/`; finish with green `pnpm test`
- No `any` (`.cursor/rules/no-any.mdc`)
- Permissions unchanged: create LEADER+; edit/delete creator or ADMIN/SUPER_ADMIN
- Duplicate append is **idempotent**: return 200 with playlist (do not create a second `PlaylistSong`)
- No drag-and-drop; up/down buttons only
- Do not change share token or Tag models

---

## File map

| File | Responsibility |
|------|----------------|
| `src/app/api/playlists/[id]/songs/route.ts` | `POST` append song |
| `src/app/api/playlists/[id]/songs/[songId]/route.ts` | `DELETE` remove song + compact order |
| `tests/api/playlists-songs.test.ts` | TDD for append/remove |
| `src/components/create-playlist-dialog.tsx` | Create name/description dialog |
| `src/components/add-songs-to-playlist-dialog.tsx` | Search/filter songs → append to one playlist |
| `src/components/add-to-playlist-dialog.tsx` | Pick playlist (or create) for one song |
| `src/app/(main)/playlists/page.tsx` | Open create dialog; drop link to `/new` |
| `src/app/(main)/playlists/[id]/page.tsx` | Add / reorder / remove / edit metadata |
| Delete `src/app/(main)/playlists/new/page.tsx` | — |
| Delete `src/app/(main)/playlists/[id]/edit/page.tsx` | — |
| `src/app/(main)/songs/page.tsx` | Row/action → AddToPlaylistDialog |
| `src/app/(main)/songs/[id]/page.tsx` | Button → AddToPlaylistDialog |
| `src/messages/zh.json`, `src/messages/en.json` | New copy keys |

Reuse `assertCanModifyPlaylist` logic from `src/app/api/playlists/[id]/route.ts` — extract to a shared helper in that file or `src/lib/playlist-access.ts` if both song routes need it (prefer extract to avoid duplication).

---

### Task 1: Append song API (`POST .../songs`)

**Files:**
- Create: `src/app/api/playlists/[id]/songs/route.ts`
- Create: `tests/api/playlists-songs.test.ts`
- Modify (optional extract): `src/app/api/playlists/[id]/route.ts` — export/share `assertCanModifyPlaylist` + `playlistSongInclude`

**Interfaces:**
- Consumes: `requirePermission(PERMISSIONS.PLAYLIST_EDIT)`, `assertCanModifyPlaylist(id)`
- Produces: `POST` handler; body `{ songId: string }`; returns playlist with `playlistSongInclude`; 400 if missing `songId`; 404 if playlist missing; 401/403 via thrown auth errors

- [ ] **Step 1: Write failing tests**

Add to `tests/api/playlists-songs.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/playlists/[id]/songs/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 'p1' }) }

describe('POST /api/playlists/[id]/songs', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 403 for MEMBER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'MEMBER' },
    })
    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('appends song at end for owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique
      .mockResolvedValueOnce({ createdById: 'u1' }) // assertCanModify
      .mockResolvedValueOnce({ id: 'p1', songs: [] }) // final include fetch OR use create return
    mockPrisma.playlistSong.findUnique.mockResolvedValue(null)
    mockPrisma.playlistSong.aggregate = vi.fn().mockResolvedValue({ _max: { order: 2 } })
    // If aggregate is not on mock, use findFirst orderBy desc instead in implementation
    mockPrisma.playlistSong.findFirst.mockResolvedValue({ order: 2 })
    mockPrisma.playlistSong.create.mockResolvedValue({
      playlistId: 'p1',
      songId: 's1',
      order: 3,
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({
      id: 'p1',
      title: '主日',
      songs: [{ order: 3, song: { id: 's1' } }],
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )
    const { status } = await readJson(res)
    expect(status).toBe(200)
    expect(mockPrisma.playlistSong.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { playlistId: 'p1', songId: 's1', order: 3 },
      })
    )
  })

  it('is idempotent when song already in playlist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({ createdById: 'u1' })
    mockPrisma.playlistSong.findUnique.mockResolvedValue({
      playlistId: 'p1',
      songId: 's1',
      order: 1,
    })
    // Second findUnique for return payload — chain as needed
    mockPrisma.playlist.findUnique.mockResolvedValue({
      id: 'p1',
      songs: [],
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
    expect(mockPrisma.playlistSong.create).not.toHaveBeenCalled()
  })
})
```

Adjust mocks to match the exact helper/query shape you implement; keep assertions on status + create call / no create.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm exec vitest run tests/api/playlists-songs.test.ts
```

Expected: FAIL (module not found or handler missing).

- [ ] **Step 3: Implement POST route**

Create `src/app/api/playlists/[id]/songs/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'
// Import shared assertCanModifyPlaylist + playlistSongInclude
// (extract from [id]/route.ts into src/lib/playlist-access.ts if cleaner)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PLAYLIST_EDIT)
    const { id } = await params
    const { playlist } = await assertCanModifyPlaylist(id)
    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    const body = await request.json()
    const songId = body?.songId
    if (!songId || typeof songId !== 'string') {
      return NextResponse.json({ error: 'songId 为必填项' }, { status: 400 })
    }

    const existing = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId: id, songId } },
    })
    if (!existing) {
      const last = await prisma.playlistSong.findFirst({
        where: { playlistId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      await prisma.playlistSong.create({
        data: {
          playlistId: id,
          songId,
          order: (last?.order ?? 0) + 1,
        },
      })
    }

    const updated = await prisma.playlist.findUnique({
      where: { id },
      include: playlistSongInclude,
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Add playlist song error:', error)
    const message = getErrorMessage(error, '添加歌曲失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
```

Extract `assertCanModifyPlaylist` and `playlistSongInclude` so `[id]/route.ts` and this file share one definition (e.g. `src/lib/playlist-access.ts`).

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm exec vitest run tests/api/playlists-songs.test.ts
```

- [ ] **Step 5: Commit** (only if user asked to commit; otherwise skip)

```bash
git add src/lib/playlist-access.ts src/app/api/playlists/[id]/route.ts \
  src/app/api/playlists/[id]/songs/route.ts tests/api/playlists-songs.test.ts
git commit -m "$(cat <<'EOF'
feat: add POST append song to playlist API

EOF
)"
```

---

### Task 2: Remove song API (`DELETE .../songs/[songId]`)

**Files:**
- Create: `src/app/api/playlists/[id]/songs/[songId]/route.ts`
- Modify: `tests/api/playlists-songs.test.ts`
- Consumes: same `assertCanModifyPlaylist` / `playlistSongInclude`

**Interfaces:**
- Produces: `DELETE` handler; removes row; rewrites remaining songs’ `order` to `1..n`; returns updated playlist; 404 if playlist missing

- [ ] **Step 1: Write failing tests**

```ts
import { DELETE } from '@/app/api/playlists/[id]/songs/[songId]/route'

const songParams = {
  params: Promise.resolve({ id: 'p1', songId: 's1' }),
}

it('DELETE removes song and compacts order', async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'u1', role: 'LEADER' },
  })
  mockPrisma.playlist.findUnique.mockResolvedValue({ createdById: 'u1' })
  mockPrisma.playlistSong.delete.mockResolvedValue({})
  mockPrisma.playlistSong.findMany.mockResolvedValue([
    { songId: 's2', order: 2 },
    { songId: 's3', order: 3 },
  ])
  mockPrisma.playlistSong.update.mockResolvedValue({})
  mockPrisma.playlist.findUnique.mockResolvedValue({ id: 'p1', songs: [] })

  const res = await DELETE(
    jsonRequest('http://localhost/api/playlists/p1/songs/s1', {
      method: 'DELETE',
    }),
    songParams
  )
  expect((await readJson(res)).status).toBe(200)
  expect(mockPrisma.playlistSong.delete).toHaveBeenCalled()
  expect(mockPrisma.playlistSong.update).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm exec vitest run tests/api/playlists-songs.test.ts
```

- [ ] **Step 3: Implement DELETE**

```ts
// src/app/api/playlists/[id]/songs/[songId]/route.ts
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; songId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PLAYLIST_EDIT)
    const { id, songId } = await params
    const { playlist } = await assertCanModifyPlaylist(id)
    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    await prisma.playlistSong.delete({
      where: { playlistId_songId: { playlistId: id, songId } },
    }).catch(() => null) // or find first; if missing still return playlist

    const remaining = await prisma.playlistSong.findMany({
      where: { playlistId: id },
      orderBy: { order: 'asc' },
    })
    await Promise.all(
      remaining.map((row, index) =>
        prisma.playlistSong.update({
          where: {
            playlistId_songId: { playlistId: id, songId: row.songId },
          },
          data: { order: index + 1 },
        })
      )
    )

    const updated = await prisma.playlist.findUnique({
      where: { id },
      include: playlistSongInclude,
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    const message = getErrorMessage(error, '移除歌曲失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm exec vitest run tests/api/playlists-songs.test.ts
```

Also run existing playlist tests:

```bash
pnpm exec vitest run tests/api/playlists.test.ts
```

- [ ] **Step 5: Commit** (if requested)

---

### Task 3: `CreatePlaylistDialog` + list page; remove `/new`

**Files:**
- Create: `src/components/create-playlist-dialog.tsx`
- Modify: `src/app/(main)/playlists/page.tsx`
- Delete: `src/app/(main)/playlists/new/page.tsx`
- Modify: `src/messages/zh.json`, `src/messages/en.json` (keys below)

**Interfaces:**
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onCreated?: (playlist: { id: string }) => void`
- POST `/api/playlists` with `{ title, description }` (no songIds)
- On success: `router.push(`/playlists/${id}`)` or call `onCreated`

- [ ] **Step 1: Add i18n keys** (zh + en under `playlists`):

```json
"addSongs": "添加歌曲",
"addToPlaylist": "加入歌单",
"added": "已添加",
"createDialogTitle": "新建歌单",
"editInfo": "编辑信息",
"addSuccess": "已加入歌单",
"addFailed": "加入失败",
"removeFailed": "移除失败",
"noPlaylistsYet": "还没有可加入的歌单",
"createAndAdd": "新建并加入"
```

Keep existing `name`, `description`, `titleRequired`, `create`, `createFailed`.

- [ ] **Step 2: Implement dialog**

```tsx
'use client'
// create-playlist-dialog.tsx
// Dialog + title Input + description Textarea + submit
// fetch POST /api/playlists → toast on error → onCreated / router.push
```

Use existing `@/components/ui/dialog` exports (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, etc.).

- [ ] **Step 3: Wire `playlists/page.tsx`**

- Replace `<Link href="/playlists/new">` with button that sets `createOpen=true`
- Empty state same
- Render `<CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} />`

- [ ] **Step 4: Delete** `src/app/(main)/playlists/new/page.tsx`

- [ ] **Step 5: Manual check** — open list, create empty playlist, land on detail

- [ ] **Step 6: Commit** (if requested)

---

### Task 4: Playlist detail — add / reorder / remove / edit metadata; remove `/edit`

**Files:**
- Create: `src/components/add-songs-to-playlist-dialog.tsx`
- Modify: `src/app/(main)/playlists/[id]/page.tsx`
- Delete: `src/app/(main)/playlists/[id]/edit/page.tsx`

**Interfaces:**
- `AddSongsToPlaylistDialog`: props `{ playlistId, open, onOpenChange, existingSongIds: string[], onChanged: () => void }`
  - Fetches `/api/songs?search&tagIds&limit=50`
  - `POST /api/playlists/${id}/songs` on +
  - Disable or show “已添加” when `existingSongIds.includes(id)`
- Detail page:
  - Toolbar: 添加歌曲 (if `canEdit`), 编辑信息 (small dialog: title/description → `PUT` with current `songIds` order)
  - Each row: up / down → `PUT` with reordered `songIds` + title + description
  - Remove → `DELETE .../songs/${songId}` then refresh
  - Remove link to `/edit`

**PUT reorder body:**

```ts
await fetch(`/api/playlists/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: playlist.title,
    description: playlist.description,
    songIds: orderedIds,
  }),
})
```

- [ ] **Step 1: Build `AddSongsToPlaylistDialog`** (reuse search + `TagMultiSelect` patterns from deleted new page)

- [ ] **Step 2: Rewrite detail page actions** as above; drop lyrics-heavy clutter only if already there — keep display as-is, add controls

- [ ] **Step 3: Delete** `src/app/(main)/playlists/[id]/edit/page.tsx`

- [ ] **Step 4: Manual check** — empty playlist → add songs → reorder → remove

- [ ] **Step 5: Commit** (if requested)

---

### Task 5: `AddToPlaylistDialog` on songs list + song detail

**Files:**
- Create: `src/components/add-to-playlist-dialog.tsx`
- Modify: `src/app/(main)/songs/page.tsx`
- Modify: `src/app/(main)/songs/[id]/page.tsx`

**Interfaces:**
- Props: `songId: string`, `open`, `onOpenChange`
- Load `GET /api/playlists` (page size enough, e.g. `limit=100`); filter client-side to playlists user can edit: `createdById === session.user.id || isAdminOrAbove`
- Click playlist → `POST /api/playlists/${id}/songs` `{ songId }` → toast success → close
- Footer: open `CreatePlaylistDialog`; on created, immediately `POST` append then toast; optional `router.push` to playlist

Only show entry points when `permissions.canEditPlaylist` (or `canCreatePlaylist` for create path). If user can create but not edit others’ lists, still show dialog for own lists + create.

- [ ] **Step 1: Implement `AddToPlaylistDialog`**

- [ ] **Step 2: Songs list** — list row: icon button / menu item “加入歌单” stopping Link navigation (`e.preventDefault()` / `e.stopPropagation()`)

- [ ] **Step 3: Song detail** — button next to Share: “加入歌单”

- [ ] **Step 4: Manual check** — add from list and detail; create-and-add from dialog footer

- [ ] **Step 5: Commit** (if requested)

---

### Task 6: Verification

- [ ] **Step 1: Run full suite**

```bash
pnpm test
```

Expected: all green.

- [ ] **Step 2: Grep for dead links**

```bash
rg "playlists/new|playlists/.*/edit" src
```

Expected: no matches (except maybe docs).

- [ ] **Step 3: Spec checklist**

| Spec item | Task |
|-----------|------|
| Create dialog on list | 3 |
| Add songs dialog on detail | 4 |
| Immediate append/remove | 1, 2, 4 |
| Reorder on detail | 4 |
| Edit metadata on detail | 4 |
| Add to playlist from library/detail | 5 |
| Create then add from 加入歌单 | 5 |
| Remove `/new` and `/edit` | 3, 4 |
| POST/DELETE song routes | 1, 2 |

---

## Self-review notes

- Spec coverage mapped in Task 6 table
- Duplicate append: idempotent 200 (locked in Global Constraints)
- Shared ACL helper avoids diverging auth between routes
- No UI unit tests required by repo rules (API tests only); manual checks in Tasks 3–5
