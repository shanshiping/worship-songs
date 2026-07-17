# Leaderboard Pagination & Year Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the song leaderboard complete with server-side pagination (10/20/50) and a specific-year (or all-time) filter.

**Architecture:** Extend `GET /api/leaderboard` to accept `year`, `page`, and `pageSize`, aggregate `MeetingSong` counts with optional `Meeting.date` year filter, return paginated ranks plus available years. Update the leaderboard page controls and list to match the songs-page pagination pattern.

**Tech Stack:** Next.js App Router, Prisma 7 (`groupBy` + `MeetingSong`/`Meeting`/`Song`), existing Card/Button UI, native `<select>` (same as songs page).

**Spec:** `docs/superpowers/specs/2026-07-17-leaderboard-pagination-year-design.md`

## Global Constraints

- `pageSize` allowed values only: `10`, `20`, `50` (invalid → `20`)
- Year filter uses `new Date(\`${year}-01-01\`)` … `new Date(\`${year}-12-31\`)` (same as export API)
- Global rank = `(page - 1) * pageSize + index + 1` (never reset per page)
- When `total === 0`, return `totalPages: 0`
- Do not change dashboard Top songs (`src/app/api/dashboard/route.ts`)
- No new test framework; verify with curl against local `pnpm dev` + Postgres

## File Structure

| File | Responsibility |
|------|----------------|
| `src/app/api/leaderboard/route.ts` | Year filter, pagination, years list, ranked payload |
| `src/app/(main)/leaderboard/page.tsx` | Year + pageSize controls, podium page 1, list + pager |

---

### Task 1: Leaderboard API — year + pagination

**Files:**
- Modify: `src/app/api/leaderboard/route.ts` (replace entire handler logic)
- Test: manual curl (no automated test suite in repo)

**Interfaces:**
- Consumes: `prisma.meetingSong.groupBy`, `prisma.song.findMany`, `prisma.meeting.findMany`
- Produces: `GET /api/leaderboard?year=&page=&pageSize=` →
  ```ts
  {
    year: number | null
    page: number
    pageSize: number
    total: number
    totalPages: number
    years: number[]
    leaderboard: Array<{
      rank: number
      id: string | undefined
      title: string
      artist: string | null | undefined
      category: string
      count: number
    }>
  }
  ```

- [ ] **Step 1: Replace API implementation**

Replace the contents of `src/app/api/leaderboard/route.ts` with:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_PAGE_SIZES = new Set([10, 20, 50])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const pageSize = ALLOWED_PAGE_SIZES.has(rawPageSize) ? rawPageSize : 20

    const year =
      yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : null

    const dateFilter =
      year !== null
        ? {
            meeting: {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
              },
            },
          }
        : {}

    const [grouped, meetings] = await Promise.all([
      prisma.meetingSong.groupBy({
        by: ['songId'],
        where: dateFilter,
        _count: { songId: true },
        orderBy: { _count: { songId: 'desc' } },
      }),
      prisma.meeting.findMany({
        select: { date: true },
      }),
    ])

    const years = [
      ...new Set(meetings.map((m) => m.date.getFullYear())),
    ].sort((a, b) => b - a)

    const total = grouped.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const skip = (page - 1) * pageSize
    const pageGroups = grouped.slice(skip, skip + pageSize)

    const songs = await prisma.song.findMany({
      where: { id: { in: pageGroups.map((g) => g.songId) } },
      include: { category: true },
    })
    const songMap = new Map(songs.map((s) => [s.id, s]))

    const leaderboard = pageGroups.map((item, index) => {
      const song = songMap.get(item.songId)
      return {
        rank: skip + index + 1,
        id: song?.id,
        title: song?.title || '未知歌曲',
        artist: song?.artist,
        category: song?.category?.name || '未分类',
        count: item._count.songId,
      }
    })

    return NextResponse.json({
      year,
      page,
      pageSize,
      total,
      totalPages,
      years,
      leaderboard,
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify API with curl (dev server must be running)**

Run:

```bash
# All-time page 1
curl -s "http://localhost:3000/api/leaderboard?page=1&pageSize=10" | python3 -m json.tool | head -40

# Year filter (use a year returned in `years`)
curl -s "http://localhost:3000/api/leaderboard?year=2025&page=1&pageSize=10" | python3 -m json.tool | head -40

# Page 2 ranks should start at 11 when pageSize=10
curl -s "http://localhost:3000/api/leaderboard?page=2&pageSize=10" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['leaderboard'][0]['rank'] if d['leaderboard'] else 'empty', d['total'], d['totalPages'], d['years'][:5])"

# Invalid pageSize falls back to 20
curl -s "http://localhost:3000/api/leaderboard?pageSize=99" | python3 -c "import sys,json; print(json.load(sys.stdin)['pageSize'])"
```

Expected:
- First call returns `pageSize: 10`, `years` array, `rank` starting at 1
- Year call returns only that year’s counts (or empty list)
- Page 2 first rank is `11` when enough songs exist
- Invalid pageSize prints `20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/leaderboard/route.ts
git commit -m "$(cat <<'EOF'
feat(leaderboard): add year filter and pagination to API

EOF
)"
```

---

### Task 2: Leaderboard page UI — year, pageSize, pager

**Files:**
- Modify: `src/app/(main)/leaderboard/page.tsx` (full page update)
- Reference UX: `src/app/(main)/songs/page.tsx` pagination block (~lines 638–676) and native `<select>` (~407–421)

**Interfaces:**
- Consumes: Task 1 API response shape (`year`, `page`, `pageSize`, `total`, `totalPages`, `years`, `leaderboard`)
- Produces: Client page that fetches with those query params and renders controls + list + pager

- [ ] **Step 1: Rewrite the leaderboard page**

Replace `src/app/(main)/leaderboard/page.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Medal, Award, Music } from 'lucide-react'
import Link from 'next/link'

interface LeaderboardItem {
  rank: number
  id: string
  title: string
  artist: string | null
  category: string
  count: number
}

const PAGE_SIZES = [10, 20, 50] as const

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<string>('') // '' = 全部时间
  const [years, setYears] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    fetchLeaderboard()
  }, [year, page, pageSize])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (year) params.set('year', year)

      const response = await fetch(`/api/leaderboard?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
        setYears(data.years || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground w-6 text-center">
            {rank}
          </span>
        )
    }
  }

  const periodLabel = year ? `${year} 年` : '全部时间'
  const showPodium = page === 1 && leaderboard.length > 0
  const podiumItems = showPodium ? leaderboard.slice(0, 3) : []
  const listItems = showPodium ? leaderboard.slice(3) : leaderboard

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">歌曲排行榜</h1>
        <p className="text-muted-foreground">查看最受欢迎的歌曲</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label="选择年份"
        >
          <option value="">全部时间</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </select>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label="每页条数"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              每页 {size} 条
            </option>
          ))}
        </select>

        {!loading && total > 0 && (
          <span className="text-sm text-muted-foreground">
            共 {total} 首 · {periodLabel}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无数据</p>
            <p className="text-sm text-muted-foreground mt-1">
              添加聚会记录后即可查看排行榜
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {showPodium && (
            <div className="grid gap-4 md:grid-cols-3">
              {podiumItems.map((item) => (
                <Link key={item.id} href={`/songs/${item.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(item.rank)}
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      {item.artist && (
                        <CardDescription>{item.artist}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">{item.count}</span>
                        <span className="text-muted-foreground">次使用</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>完整排行榜</CardTitle>
              <CardDescription>
                {periodLabel}使用次数最多的歌曲
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {listItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/songs/${item.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-bold text-muted-foreground w-8 text-center">
                        {item.rank}
                      </span>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.artist && (
                          <p className="text-sm text-muted-foreground">
                            {item.artist}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{item.category}</Badge>
                      <div className="flex items-center space-x-1">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{item.count}</span>
                        <span className="text-sm text-muted-foreground">次</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                上一页
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual UI verification**

With `pnpm dev` running, open `http://localhost:3000/leaderboard` (logged in):

1. Default shows「全部时间」、每页 20、完整列表（不只 20 封顶）
2. Change pageSize to 10 → resets to page 1; pager appears if `total > 10`
3. Go to page 2 → no Top 3 podium; first row rank continues (11…)
4. Pick a year from dropdown → list updates;「共 N 首 · YYYY 年」
5. Pick「全部时间」→ back to all-time
6. Dashboard `/dashboard` still loads Top songs independently

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/leaderboard/page.tsx
git commit -m "$(cat <<'EOF'
feat(leaderboard): add year select, page size, and pagination UI

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Full ranked list (not capped at 20) | Task 1 + 2 |
| Year dropdown + 全部时间 | Task 1 `years` + Task 2 select |
| pageSize 10/20/50 + page numbers | Task 1 params + Task 2 pager |
| Global ranks across pages | Task 1 `rank = skip + index + 1` |
| Top 3 podium only on page 1 | Task 2 `showPodium` |
| Dashboard unchanged | Global constraint / out of scope |
| Export-style year date bounds | Task 1 `gte`/`lte` |
| `totalPages: 0` when empty | Task 1 |

No placeholders remaining. Types match between Task 1 response and Task 2 state.
