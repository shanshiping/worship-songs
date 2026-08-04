'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Calendar, Users, Trophy, TrendingUp, ArrowUpRight, CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/components/providers/i18n-provider'

interface DashboardStats {
  totalSongs: number
  totalMeetings: number
  totalCategories: number
  topSongs: Array<{ title: string; count: number }>
}

export default function DashboardPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    totalMeetings: 0,
    totalCategories: 0,
    topSongs: [],
  })
  const [loading, setLoading] = useState(true)

  const statCards = [
    {
      title: t('dashboard.totalSongs'),
      icon: Music,
      key: 'totalSongs' as const,
    },
    {
      title: t('dashboard.totalMeetings'),
      icon: Calendar,
      key: 'totalMeetings' as const,
    },
    {
      title: t('dashboard.totalCategories'),
      icon: Users,
      key: 'totalCategories' as const,
    },
    {
      title: t('dashboard.mostPopular'),
      icon: Trophy,
      key: 'topSong' as const,
    },
  ]

  const quickActions = [
    {
      title: t('dashboard.viewGuide'),
      description: t('dashboard.viewGuideDesc'),
      href: '/guide',
      icon: CircleHelp,
    },
    {
      title: t('dashboard.uploadSong'),
      description: t('dashboard.uploadSongDesc'),
      href: '/song-upload',
      icon: Music,
    },
    {
      title: t('dashboard.newMeeting'),
      description: t('dashboard.newMeetingDesc'),
      href: '/meetings/new',
      icon: Calendar,
    },
    {
      title: t('dashboard.importData'),
      description: t('dashboard.importDataDesc'),
      href: '/data',
      icon: TrendingUp,
    },
    {
      title: t('dashboard.viewLeaderboard'),
      description: t('dashboard.viewLeaderboardDesc'),
      href: '/leaderboard',
      icon: Trophy,
    },
  ]

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-4 w-64 skeleton rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="mb-4 h-4 w-24 skeleton rounded" />
                <div className="h-8 w-16 skeleton rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <p className="mb-2 text-sm font-medium text-primary">{t('dashboard.welcomeBack')}</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card
            key={card.key}
            className="card-hover animate-fade-in border-0 shadow-sm"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <card.icon className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold">
                  {card.key === 'topSong'
                    ? (stats.topSongs[0]?.title || t('dashboard.none'))
                    : String(stats[card.key as keyof DashboardStats] || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t('dashboard.topSongs')}</CardTitle>
                <CardDescription>{t('dashboard.topSongsDesc')}</CardDescription>
              </div>
              <Link
                href="/leaderboard"
                className="flex items-center text-sm text-primary hover:underline"
              >
                {t('dashboard.viewAll')}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topSongs.length > 0 ? (
              <div className="space-y-3">
                {stats.topSongs.slice(0, 5).map((song, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                          index === 0
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium transition-colors group-hover:text-primary">
                          {song.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.usedTimes', { count: song.count })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{
                            width: `${(song.count / (stats.topSongs[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Trophy className="mb-3 h-12 w-12 opacity-50" />
                <p>{t('dashboard.noData')}</p>
                <p className="text-sm">{t('dashboard.noDataHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '500ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
            <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted transition-transform group-hover:scale-105">
                    <action.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <p className="font-medium transition-colors group-hover:text-primary">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
