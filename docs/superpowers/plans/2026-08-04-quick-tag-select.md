# Quick Tag Select UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors change song tags from the detail cover dialog, and let anyone filter the songs list by clicking tag badges.

**Architecture:** Extend `SongTagBadges` with optional click handlers for list filtering. Add `EditSongTagsDialog` on song detail that reuses `TagMultiSelect` and `PUT /api/songs/[id]` with existing fields + `tagIds`. No new API routes.

**Tech Stack:** Next.js client components, existing Dialog / TagMultiSelect, i18n (`en.json` / `zh.json`), Vitest only if touching `src/lib` or API (this plan is UI-only).

## Global Constraints

- Cover edit requires `canEditSong`; list filter is open to all
- List badge click toggles filter only (does not edit the song)
- “未分类” clears type + style filters
- Reuse `GET /api/tags`, `PUT /api/songs/[id]` — no new routes
- Share page badges remain display-only
- No `any`
- No API/lib behavior change → no mandatory new API tests; keep `pnpm test` green

---

## File map

| File | Responsibility |
|------|----------------|
| `src/components/tag-multi-select.tsx` | `SongTagBadges` optional `onTagClick` / `onUncategorizedClick` |
| `src/components/edit-song-tags-dialog.tsx` | Dialog to edit TYPE/STYLE tags |
| `src/app/(main)/songs/page.tsx` | Wire badge clicks → filter state |
| `src/app/(main)/songs/[id]/page.tsx` | Clickable cover → dialog |
| `src/messages/zh.json`, `src/messages/en.json` | Copy keys |

---

### Task 1: Clickable `SongTagBadges` + songs list filter

**Files:**
- Modify: `src/components/tag-multi-select.tsx`
- Modify: `src/app/(main)/songs/page.tsx`
- Modify: `src/messages/zh.json`, `src/messages/en.json` (only if adding title/hint; otherwise Task 2)

**Interfaces:**
- Produces:

```ts
export function SongTagBadges({
  tags,
  onTagClick,
  onUncategorizedClick,
}: {
  tags?: Array<{ tag: TagItem }>
  onTagClick?: (tag: TagItem) => void
  onUncategorizedClick?: () => void
}): JSX.Element
```

- When `onTagClick` is set, each tag badge is a `<button type="button">` that calls `onTagClick(st.tag)` and `e.stopPropagation()` / `e.preventDefault()`.
- When no tags and `onUncategorizedClick` is set, the「未分类」badge is a button calling that handler with stopPropagation.
- When handlers omitted, keep current static `Badge` markup (share page unchanged).

- [ ] **Step 1: Extend `SongTagBadges`**

Implement the props above. Use `cn` so clickable badges get `cursor-pointer hover:opacity-80` (or similar) without breaking outline/secondary variants.

- [ ] **Step 2: Wire songs list**

In `src/app/(main)/songs/page.tsx`, both grid and list `SongTagBadges` usages:

```tsx
<SongTagBadges
  tags={song.tags}
  onTagClick={(tag) => {
    setPage(1)
    if (tag.kind === 'TYPE') {
      setSelectedTypeIds((prev) =>
        prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
      )
    } else if (tag.kind === 'STYLE') {
      setSelectedStyleIds((prev) =>
        prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
      )
    }
  }}
  onUncategorizedClick={() => {
    setSelectedTypeIds([])
    setSelectedStyleIds([])
    setPage(1)
  }}
/>
```

Ensure badges sit such that clicks do not navigate (already outside Link in list row for tags column; grid has badges inside Link — stopPropagation on the button is required).

- [ ] **Step 3: Manual check** — click TYPE/STYLE badges toggles filter chips above; click 未分类 clears both.

- [ ] **Step 4: Commit** (if committing in this workflow)

```bash
git add src/components/tag-multi-select.tsx src/app/\(main\)/songs/page.tsx
git commit -m "$(cat <<'EOF'
feat: filter songs list by clicking tag badges

EOF
)"
```

---

### Task 2: `EditSongTagsDialog` + detail cover

**Files:**
- Create: `src/components/edit-song-tags-dialog.tsx`
- Modify: `src/app/(main)/songs/[id]/page.tsx`
- Modify: `src/messages/zh.json`, `src/messages/en.json`

**Interfaces:**
- Consumes: `TagMultiSelect`, Dialog UI, `GET /api/tags`, song object
- Produces:

```ts
type EditSongTagsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  song: {
    id: string
    title: string
    artist: string | null
    key: string | null
    timeSignature: string | null
    composer: string | null
    lyricist: string | null
    team: string | null
    album: string | null
    mvUrl: string | null
    sheetMusic: string | null
    audioFile: string | null
    lyrics: string | null
    notes: string | null
    tags: Array<{ tag: TagItem }>
  }
  onSaved: () => void
}
```

`PUT` body must include existing scalar fields (API replaces all tags and expects title etc.):

```ts
body: JSON.stringify({
  title: song.title,
  artist: song.artist,
  key: song.key,
  timeSignature: song.timeSignature,
  composer: song.composer,
  lyricist: song.lyricist,
  team: song.team,
  album: song.album,
  mvUrl: song.mvUrl,
  sheetMusic: song.sheetMusic,
  audioFile: song.audioFile,
  lyrics: song.lyrics,
  notes: song.notes,
  tagIds: selectedIds,
})
```

- [ ] **Step 1: Add i18n keys** (zh + en under `songs`):

```json
"editTags": "编辑标签",
"editTagsHint": "点击封面编辑标签",
"saveTags": "保存标签",
"tagsUpdateSuccess": "标签已更新",
"tagsUpdateFailed": "更新标签失败"
```

- [ ] **Step 2: Implement `EditSongTagsDialog`**

- On open: fetch `/api/tags`, split TYPE/STYLE; init `selectedIds` from `song.tags.map(t => t.tag.id)`
- Two `TagMultiSelect`s
- Save button → PUT → toast success/error → `onSaved()` + `onOpenChange(false)`

- [ ] **Step 3: Wire detail cover**

In `songs/[id]/page.tsx`:

- State: `tagsDialogOpen`
- When `permissions.canEditSong`, wrap the gradient cover `div` (the one using `getCategoryColor`) with `role="button"` / `onClick` / `onKeyDown` Enter-Space, `cursor-pointer`, `title={t('songs.editTagsHint')}`
- Do not make the whole card navigate away
- Render `<EditSongTagsDialog open={...} song={song} onSaved={fetchSong} />`

Without `canEditSong`, leave cover as today.

- [ ] **Step 4: Manual check** — editor opens dialog, saves, badges/cover update; member cannot open.

- [ ] **Step 5: Commit**

```bash
git add src/components/edit-song-tags-dialog.tsx \
  src/app/\(main\)/songs/\[id\]/page.tsx \
  src/messages/zh.json src/messages/en.json
git commit -m "$(cat <<'EOF'
feat: edit song tags from detail cover dialog

EOF
)"
```

---

### Task 3: Verification

- [ ] **Step 1:** `pnpm test` — all green

- [ ] **Step 2:** Grep share page still uses display-only badges:

```bash
rg "SongTagBadges" src/app/share -A2
```

Expected: no `onTagClick`.

- [ ] **Step 3:** Spec checklist

| Spec item | Task |
|-----------|------|
| Cover dialog edit (canEditSong) | 2 |
| List badge filter toggle | 1 |
| 未分类 clears filters | 1 |
| No new API | — |
| Share unchanged | 3 |

---

## Self-review

- Spec coverage mapped in Task 3
- PUT must send full song scalars (documented in Task 2) — easy to miss
- Grid badges inside Link rely on stopPropagation (Task 1)
