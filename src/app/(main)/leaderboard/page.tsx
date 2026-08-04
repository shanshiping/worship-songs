'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Medal, Award, Music } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/components/providers/i18n-provider'

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
  const { t } = useI18n()
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<string>('')
  const [years, setYears] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        if (year) params.set('year', year)

        const response = await fetch(`/api/leaderboard?${params}`)
        if (!response.ok || cancelled) return

        const data = await response.json()
        if (cancelled) return

        setLeaderboard(data.leaderboard)
        setYears(data.years || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch leaderboard:', error)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [year, page, pageSize])

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
          <span className="text-sm font-medium text-muted-foreground w-6 text-center">
            {rank}
          </span>
        )
    }
  }

  const renderPodiumCard = (item: LeaderboardItem) => {
    const card = (
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getRankIcon(item.rank)}
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </div>
            <Badge variant="secondary">{item.category}</Badge>
          </div>
          {item.artist && <CardDescription>{item.artist}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold">{item.count}</span>
            <span className="text-muted-foreground">{t('leaderboard.timesUsed')}</span>
          </div>
        </CardContent>
      </Card>
    )

    if (!item.id) return card

    return (
      <Link href={`/songs/${item.id}`} className="block h-full">
        {card}
      </Link>
    )
  }

  const renderListRow = (item: LeaderboardItem) => {
    const row = (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-muted-foreground w-8 text-center">
            {item.rank}
          </span>
          <div>
            <p className="font-medium">{item.title}</p>
            {item.artist && (
              <p className="text-sm text-muted-foreground">{item.artist}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">{item.category}</Badge>
          <div className="flex items-center space-x-1">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{item.count}</span>
            <span className="text-sm text-muted-foreground">{t('leaderboard.times')}</span>
          </div>
        </div>
      </div>
    )

    if (!item.id) return row

    return <Link href={`/songs/${item.id}`}>{row}</Link>
  }

  const periodLabel = year
    ? t('leaderboard.yearLabel', { year })
    : t('leaderboard.allTime')
  const showPodium = page === 1 && leaderboard.length > 0
  const podiumItems = showPodium ? leaderboard.slice(0, 3) : []
  const listItems = showPodium ? leaderboard.slice(3) : leaderboard

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('leaderboard.title')}</h1>
        <p className="text-muted-foreground">{t('leaderboard.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label={t('leaderboard.selectYear')}
        >
          <option value="">{t('leaderboard.allTime')}</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {t('leaderboard.yearOption', { year: y })}
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
          aria-label={t('leaderboard.pageSize')}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {t('leaderboard.perPage', { size })}
            </option>
          ))}
        </select>

        {!loading && total > 0 && (
          <span className="text-sm text-muted-foreground">
            {t('leaderboard.totalSongs', { total, period: periodLabel })}
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
            <p className="text-muted-foreground">{t('leaderboard.noData')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('leaderboard.noDataHint')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {showPodium && (
            <div className="grid gap-4 md:grid-cols-3">
              {podiumItems.map((item) => (
                <div key={item.id || `rank-${item.rank}`}>{renderPodiumCard(item)}</div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('leaderboard.fullList')}</CardTitle>
              <CardDescription>
                {t('leaderboard.periodDesc', { period: periodLabel })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {listItems.map((item) => (
                  <div key={item.id || `rank-${item.rank}`}>{renderListRow(item)}</div>
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
                {t('leaderboard.prevPage')}
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
                {t('leaderboard.nextPage')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
