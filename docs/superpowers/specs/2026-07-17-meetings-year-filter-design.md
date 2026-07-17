# Meetings Year Filter Design

**Date:** 2026-07-17
**Status:** Approved
**Scope:** Add year selection to the Meetings list filter, keeping the existing month selection

## Problem

The Meetings list page (`src/app/(main)/meetings/page.tsx`) only supports filtering by a single month via an `<input type="month">`. Users want to filter meetings by a whole year (e.g. see all of 2025) without having to step through each month.

## Goals

- Add a year filter alongside the existing month filter
- Keep the current month filter behavior intact
- Populate the year dropdown from years that actually have meetings (same pattern as leaderboard)
- Reset to page 1 whenever the year or month filter changes

## Non-Goals

- Removing or redesigning the month input
- Day-level filtering
- Changing meeting creation/detail pages

## Approach

Extend `GET /api/meetings` to accept a `year` parameter and return the list of available `years`, then add a year `<select>` to the Meetings page filter row. Reuse the leaderboard's year-derivation and native `<select>` styling for consistency.

## API

### Endpoint

`GET /api/meetings`

### Query parameters

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int | `1` | 1-based (unchanged) |
| `limit` | int | `20` | unchanged |
| `month` | string `YYYY-MM` or empty | none | existing behavior |
| `year` | string 4-digit or empty | none | e.g. `2025`; omit/empty = all years |

### Filter precedence

- If `month` is provided, filter by that month (existing behavior). `year` is ignored.
- Else if `year` is provided and matches `/^\d{4}$/`, filter meetings whose `date` falls in `[new Date(\`${year}-01-01\`), new Date(\`${year}-12-31\`)]`.
- Else no date filter (all meetings).

This precedence keeps the current single-control month experience working unchanged and avoids ambiguous combined states.

### Response shape

Add a `years` array to the existing response so the UI can populate the dropdown without a second request:

```json
{
  "meetings": [ /* unchanged */ ],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 },
  "years": [2026, 2025, 2024]
}
```

- `years`: distinct years present in `Meeting.date`, descending. Derived from all meetings (not affected by the current filter), like the leaderboard route.

### Errors

- `500` with `{ error: "获取聚会列表失败" }` on unexpected failures (unchanged)

## UI

### Filter row (top of page)

Current row has the month input + a "clear filters" button. New layout:

- Year `<select>`: option 「全部年份 / All years」 + each entry from `years`
- Existing month `<input type="month">` (unchanged)
- "Clear filters" button: shown when either `year` or `month` is set; clears both and resets to page 1

### Behavior

- Changing the year select: set `year`, reset `page` to 1, refetch. Do NOT auto-clear `month`, but since API precedence favors `month`, the year select is effectively active only when no month is chosen. To keep behavior intuitive, selecting a year clears the month input, and choosing a month clears the year select. (Single active filter at a time.)
- Changing the month input: set `month`, reset `page` to 1, refetch (and clear `year`).
- On mount, `years` is populated from the first fetch response.

### Data fetching

`GET /api/meetings?page=...&limit=20` plus `month=YYYY-MM` OR `year=YYYY` depending on which is active. Omit both when no filter is set.

## i18n

Add to the `meetings` namespace in both `src/messages/zh.json` and `src/messages/en.json`:

| Key | zh | en |
|-----|----|----|
| `allYears` | 全部年份 | All years |
| `yearOption` | {year} 年 | {year} |
| `selectYear` | 选择年份 | Select year |

`clearFilters` already exists and is reused.

## Data flow

```
User changes year / month / page
  → fetch /api/meetings
  → API applies month filter, else year filter, else none
  → API also returns distinct years from all meetings
  → render meeting list + year dropdown + month input + pager
```

## Testing checklist

- Selecting a year shows only that year's meetings
- Selecting a month still shows only that month's meetings (unchanged)
- Choosing a year clears the month input, and vice versa
- Year dropdown lists only years that exist in meetings, descending
- "Clear filters" resets both controls and returns to page 1
- Changing year/month resets to page 1
- Empty result shows the existing empty state

## Files to change

- `src/app/api/meetings/route.ts` — accept `year`, add `years` to response, filter precedence
- `src/app/(main)/meetings/page.tsx` — year select, wire state, mutual clearing, page reset
- `src/messages/zh.json` — `meetings.allYears`, `meetings.yearOption`, `meetings.selectYear`
- `src/messages/en.json` — same keys
