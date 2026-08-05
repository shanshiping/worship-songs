'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Music, User } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
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
  songs: LeaderSongStatItem[]
}

export default function LeaderSongsPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')
  const [leader, setLeader] = useState('')
  const [years, setYears] = useState<number[]>([])
  const [leaders, setLeaders] = useState<string[]>([])
  const [stats, setStats] = useState<LeaderSongStats[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: leader ? '20' : '8' })
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

  const periodLabel = year
    ? t('meetings.leaderStats.yearLabel', { year })
    : t('meetings.leaderStats.allTime')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/meetings">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('meetings.back')}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('meetings.leaderStats.title')}
          </h1>
          <p className="text-muted-foreground">{t('meetings.leaderStats.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leader-stats-year" className="text-xs text-muted-foreground">
            {t('meetings.leaderStats.yearFilter')}
          </Label>
          <Select
            value={year || 'all'}
            onValueChange={(value) => setYear(!value || value === 'all' ? '' : value)}
          >
            <SelectTrigger id="leader-stats-year" className="min-w-[10rem]">
              <SelectValue placeholder={t('meetings.leaderStats.allTime')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('meetings.leaderStats.allTime')}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {t('meetings.leaderStats.yearOption', { year: y })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leader-stats-leader" className="text-xs text-muted-foreground">
            {t('meetings.filterByLeader')}
          </Label>
          <Select
            value={leader || 'all'}
            onValueChange={(value) => setLeader(!value || value === 'all' ? '' : value)}
          >
            <SelectTrigger id="leader-stats-leader" className="min-w-[10rem]">
              <SelectValue placeholder={t('meetings.allLeaders')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('meetings.allLeaders')}</SelectItem>
              {leaders.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
        </div>
      ) : stats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('meetings.leaderStats.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stats.map((item) => (
            <Card key={item.leader}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">{item.leader}</CardTitle>
                  <CardDescription>
                    {t('meetings.leaderStats.meetingCount', { count: item.meetingCount })}
                    {' · '}
                    {periodLabel}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {item.songs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('meetings.leaderStats.noSongs')}
                  </p>
                ) : (
                  <div className="divide-y">
                    {item.songs.map((song) => (
                      <Link
                        key={`${item.leader}-${song.id}`}
                        href={`/songs/${song.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">
                            {song.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{song.title}</p>
                            {song.artist && (
                              <p className="truncate text-sm text-muted-foreground">
                                {song.artist}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                          <Music className="h-4 w-4" />
                          <span className="font-semibold text-foreground">{song.count}</span>
                          <span>{t('meetings.leaderStats.times')}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
