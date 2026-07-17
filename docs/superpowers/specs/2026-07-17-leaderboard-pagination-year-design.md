# Leaderboard Pagination & Year Filter Design

**Date:** 2026-07-17  
**Status:** Approved  
**Scope:** Complete song leaderboard with pagination and year selection

## Problem

The current `/leaderboard` page only fetches the top 20 songs (`limit=20`), so the “完整排行榜” section is incomplete. Time filters are coarse (`all` / current year / current month) and do not support picking a specific calendar year.

## Goals

- Show the full ranked list of songs by usage count (meeting associations)
- Support selecting a specific year or “全部时间”
- Support page size 10 / 20 / 50 and page-number navigation
- Reuse existing songs/meetings pagination UX patterns

## Non-Goals

- Dashboard Top 5 / Top songs widget (unchanged)
- Month filter
- Export of leaderboard
- Client-side “fetch all then paginate”

## Approach

Extend `GET /api/leaderboard` and update `src/app/(main)/leaderboard/page.tsx`. Server-side aggregation + pagination.

## API

### Endpoint

`GET /api/leaderboard`

### Query parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `year` | string number or empty | (all time) | e.g. `2025`; omit or empty = all years |
| `page` | int | `1` | 1-based |
| `pageSize` | int | `20` | Allowed: `10`, `20`, `50`. Invalid values fall back to `20` |

Remove reliance on `period=year|month` for this page. Keep backward-compatible ignore of unused `period`/`limit` if present, or replace cleanly (no other callers use period beyond this page and dashboard does not use this API for period).

### Filtering

- Count is number of `MeetingSong` rows for each `songId`
- When `year` is set: only count rows whose related `Meeting.date` falls in `[new Date(\`${year}-01-01\`), new Date(\`${year}-12-31\`)]` (same pattern as `src/app/api/export/route.ts`)
- When unset: all meetings

### Ranking & pagination

1. `groupBy` `songId` with `_count`, `orderBy` count desc
2. Compute `total` = number of distinct songs with at least one counted usage
3. `skip = (page - 1) * pageSize`, `take = pageSize`
4. Global `rank = skip + index + 1` (not reset per page)
5. Batch-load song details (title, artist, category) for the page’s `songId`s

### Response shape

```json
{
  "year": null,
  "page": 1,
  "pageSize": 20,
  "total": 142,
  "totalPages": 8,
  "years": [2026, 2025, 2024],
  "leaderboard": [
    {
      "rank": 1,
      "id": "...",
      "title": "...",
      "artist": null,
      "category": "敬拜赞美",
      "count": 12
    }
  ]
}
```

- `years`: distinct years present in `Meeting.date`, descending. Always returned so the UI can populate the year dropdown without a second request.
- Empty result: `leaderboard: []`, `total: 0`, `totalPages: 0` (or `1` with empty list — prefer `totalPages: 0` when total is 0).

### Errors

- `500` with `{ error: "获取排行榜失败" }` on unexpected failures (same as today)

## UI

### Controls (top of page)

- Year select: option 「全部时间」 + each entry from `years`
- Page size select: 10 / 20 / 50
- Changing year or pageSize resets `page` to 1 and refetches

### Content

- **Page 1:** keep Top 3 podium cards for ranks 1–3 on the current page result, then list the rest of the current page (ranks 4…pageSize)
- **Page 2+:** list only (no podium); show global ranks
- Empty state unchanged when `total === 0`
- Loading spinner while fetching

### Pagination footer

Align with songs page:

- Previous / next buttons
- Up to 5 page number buttons around current page
- Disabled states at ends
- Only show when `totalPages > 1`

### Data fetching

`GET /api/leaderboard?year=...&page=...&pageSize=...`  
Omit `year` query param when 「全部时间」 is selected.

## Data flow

```
User changes year / page / pageSize
  → fetch /api/leaderboard
  → API filters MeetingSong by Meeting.date year (optional)
  → groupBy + count + order + skip/take
  → return page + years + totals
  → render podium (page 1) + list + pager
```

## Testing checklist

- All-time ranking matches counts from meetings
- Specific year only counts that year’s meetings
- Year with no data shows empty state
- Page 2 ranks continue (e.g. pageSize 10 → first item is rank 11)
- pageSize 10/20/50 and page resets on filter change
- Year dropdown lists only years that exist in meetings
- Dashboard still works independently

## Files to change

- `src/app/api/leaderboard/route.ts` — year filter, pagination, years list
- `src/app/(main)/leaderboard/page.tsx` — year + pageSize controls, full list paging
