'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  ListMusic,
  Medal,
  Music,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type LeaderSongStatItem = {
  rank: number
  id: string
  title: string
  artist: string | null
  count: number
}

type LeaderSongStats = {
  leader: string
  meetingCount: number
  totalSongCount: number
  songs: LeaderSongStatItem[]
}

const DISPLAY_LIMIT = 10

function RankBadge({ rank }: { rank: number }) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
    case 2:
      return <Medal className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
    case 3:
      return <Award className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
    default:
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-semibold text-muted-foreground">
          {rank}
        </span>
      )
  }
}

function UsageBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 w-full min-w-[4rem] max-w-[7rem] overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary/70 transition-all"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

function SongRow({
  song,
  maxCount,
  t,
}: {
  song: LeaderSongStatItem
  maxCount: number
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto_auto]"
    >
      <div className="flex w-8 justify-center">
        <RankBadge rank={song.rank} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium leading-snug">{song.title}</p>
        {song.artist && (
          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
        )}
      </div>
      <div className="hidden sm:block">
        <UsageBar value={song.count} max={maxCount} />
      </div>
      <div className="flex items-center justify-end gap-1 text-sm tabular-nums">
        <span className="font-semibold">{song.count}</span>
        <span className="text-muted-foreground">{t('sheets.leaderStats.times')}</span>
      </div>
    </Link>
  )
}

function LeaderStatsPanel({
  item,
  periodLabel,
  expanded,
  onToggleExpand,
  t,
}: {
  item: LeaderSongStats
  periodLabel: string
  expanded: boolean
  onToggleExpand: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const topThree = item.songs.slice(0, 3)
  const listSongs = expanded
    ? item.songs.slice(3)
    : item.songs.slice(3, DISPLAY_LIMIT)
  const maxCount = item.songs[0]?.count ?? 1

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl">{item.leader}</CardTitle>
              <CardDescription className="mt-1">{periodLabel}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {t('sheets.leaderStats.meetingCount', { count: item.meetingCount })}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ListMusic className="h-3.5 w-3.5" />
              {t('sheets.leaderStats.songCount', { count: item.totalSongCount })}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {item.songs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('sheets.leaderStats.noSongs')}</p>
        ) : (
          <>
            {topThree.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('sheets.leaderStats.topPicks')}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {topThree.map((song) => (
                    <Link
                      key={song.id}
                      href={`/songs/${song.id}`}
                      className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <RankBadge rank={song.rank} />
                        <span className="text-xs text-muted-foreground">
                          {t('sheets.leaderStats.usedTimes', { count: song.count })}
                        </span>
                      </div>
                      <p className="line-clamp-2 font-medium leading-snug">{song.title}</p>
                      {song.artist && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {song.artist}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {listSongs.length > 0 && (
              <div>
                <div className="mb-2 hidden grid-cols-[auto_1fr_auto_auto] gap-3 px-2 text-xs font-medium text-muted-foreground sm:grid">
                  <span className="w-8 text-center">{t('sheets.leaderStats.colRank')}</span>
                  <span>{t('sheets.leaderStats.colSong')}</span>
                  <span className="min-w-[4rem] max-w-[7rem]">
                    {t('sheets.leaderStats.colShare')}
                  </span>
                  <span className="text-right">{t('sheets.leaderStats.colCount')}</span>
                </div>
                <div className="divide-y rounded-lg border">
                  {listSongs.map((song) => (
                    <SongRow key={song.id} song={song} maxCount={maxCount} t={t} />
                  ))}
                </div>
              </div>
            )}

            {item.totalSongCount > DISPLAY_LIMIT && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="mr-1.5 h-4 w-4" />
                    {t('sheets.leaderStats.showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1.5 h-4 w-4" />
                    {t('sheets.leaderStats.showAll', { count: item.totalSongCount })}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function SheetsLeaderStatsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')
  const [leader, setLeader] = useState('')
  const [years, setYears] = useState<number[]>([])
  const [leaders, setLeaders] = useState<string[]>([])
  const [stats, setStats] = useState<LeaderSongStats[]>([])
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setExpandedLeaders(new Set())
      try {
        const params = new URLSearchParams()
        if (year) params.set('year', year)
        if (leader) params.set('leader', leader)

        const response = await fetch(`/api/meetings/leader-songs?${params}`)
        if (!response.ok || cancelled) return

        const data = await response.json()
        if (cancelled) return

        setStats(data.stats || [])
        setYears(data.years || [])
        setLeaders(data.leaders || [])
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch leader song stats:', error)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [year, leader])

  const summary = useMemo(() => {
    const totalMeetings = stats.reduce((sum, item) => sum + item.meetingCount, 0)
    const totalPicks = stats.reduce(
      (sum, item) => sum + item.songs.reduce((songSum, song) => songSum + song.count, 0),
      0,
    )
    return {
      leaderCount: stats.length,
      totalMeetings,
      totalPicks,
    }
  }, [stats])

  const toggleExpanded = (leaderName: string) => {
    setExpandedLeaders((current) => {
      const next = new Set(current)
      if (next.has(leaderName)) {
        next.delete(leaderName)
      } else {
        next.add(leaderName)
      }
      return next
    })
  }

  const periodLabel = year
    ? t('sheets.leaderStats.yearLabel', { year })
    : t('sheets.leaderStats.allTime')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sheets">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('sheets.back')}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{t('sheets.leaderStats.title')}</h1>
        <p className="text-muted-foreground">{t('sheets.leaderStats.subtitle')}</p>
      </div>

      {!loading && stats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{summary.leaderCount}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sheets.leaderStats.summaryLeaders')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{summary.totalMeetings}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sheets.leaderStats.summaryMeetings')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Music className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{summary.totalPicks}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sheets.leaderStats.summaryPicks')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leader-stats-year" className="text-xs text-muted-foreground">
              {t('sheets.leaderStats.yearFilter')}
            </Label>
            <Select
              value={year || 'all'}
              onValueChange={(value) => setYear(!value || value === 'all' ? '' : value)}
            >
              <SelectTrigger id="leader-stats-year" className="min-w-[10rem]">
                <SelectValue placeholder={t('sheets.leaderStats.allTime')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sheets.leaderStats.allTime')}</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {t('sheets.leaderStats.yearOption', { year: y })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leader-stats-leader" className="text-xs text-muted-foreground">
              {t('sheets.leaderStats.filterByLeader')}
            </Label>
            <Select
              value={leader || 'all'}
              onValueChange={(value) => setLeader(!value || value === 'all' ? '' : value)}
            >
              <SelectTrigger id="leader-stats-leader" className="min-w-[10rem]">
                <SelectValue placeholder={t('sheets.leaderStats.allLeaders')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sheets.leaderStats.allLeaders')}</SelectItem>
                {leaders.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leader && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setLeader('')}>
              <X className="mr-1.5 h-4 w-4" />
              {t('sheets.leaderStats.clearLeader')}
            </Button>
          )}
        </CardContent>
      </Card>

      {!leader && leaders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t('sheets.leaderStats.quickPick')}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {leaders.map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setLeader(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('sheets.leaderStats.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stats.map((item) => (
            <LeaderStatsPanel
              key={item.leader}
              item={item}
              periodLabel={periodLabel}
              expanded={expandedLeaders.has(item.leader)}
              onToggleExpand={() => toggleExpanded(item.leader)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}
