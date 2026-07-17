'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function LeaderboardPage() {
  const { t } = useI18n()
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [period])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leaderboard?period=${period}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
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
        return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{rank}</span>
    }
  }

  const periodLabels: Record<string, string> = {
    all: t('leaderboard.allTime'),
    year: t('leaderboard.thisYear'),
    month: t('leaderboard.thisMonth'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('leaderboard.title')}</h1>
        <p className="text-muted-foreground">{t('leaderboard.subtitle')}</p>
      </div>

      <div className="flex space-x-2">
        {Object.entries(periodLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
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
          <div className="grid gap-4 md:grid-cols-3">
            {leaderboard.slice(0, 3).map((item) => (
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
                      <span className="text-muted-foreground">{t('leaderboard.timesUsed')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('leaderboard.fullList')}</CardTitle>
              <CardDescription>
                {t('leaderboard.periodDesc', { period: periodLabels[period] })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.slice(3).map((item) => (
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
                        <span className="text-sm text-muted-foreground">{t('leaderboard.times')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
