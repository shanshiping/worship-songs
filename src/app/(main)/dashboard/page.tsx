'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Calendar, Users, Trophy, TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react'
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
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      key: 'totalSongs' as const,
    },
    {
      title: t('dashboard.totalMeetings'),
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      key: 'totalMeetings' as const,
    },
    {
      title: t('dashboard.totalCategories'),
      icon: Users,
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      key: 'totalCategories' as const,
    },
    {
      title: t('dashboard.mostPopular'),
      icon: Trophy,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      key: 'topSong',
    },
  ]

  const quickActions = [
    {
      title: t('dashboard.uploadSong'),
      description: t('dashboard.uploadSongDesc'),
      href: '/songs/upload',
      icon: Music,
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      title: t('dashboard.newMeeting'),
      description: t('dashboard.newMeetingDesc'),
      href: '/meetings/new',
      icon: Calendar,
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      title: t('dashboard.importData'),
      description: t('dashboard.importDataDesc'),
      href: '/data',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      title: t('dashboard.viewLeaderboard'),
      description: t('dashboard.viewLeaderboardDesc'),
      href: '/leaderboard',
      icon: Trophy,
      gradient: 'from-amber-500 to-yellow-500',
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
                <div className="h-4 w-24 skeleton rounded mb-4" />
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
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">{t('dashboard.welcomeBack')}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">{t('dashboard.title')}</span>
        </h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card
            key={card.key}
            className="card-hover animate-fade-in border-0 shadow-sm"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
                <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>12%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold">
                  {card.key === 'topSong'
                    ? (stats.topSongs[0]?.title || t('dashboard.none'))
                    : String(stats[card.key as keyof DashboardStats] || 0)
                  }
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
                className="text-sm text-primary hover:underline flex items-center"
              >
                {t('dashboard.viewAll')}
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.topSongs.length > 0 ? (
              <div className="space-y-3">
                {stats.topSongs.slice(0, 5).map((song, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          index === 0
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : index === 1
                            ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                            : index === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700'
                            : 'bg-gradient-to-br from-gray-200 to-gray-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {song.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.usedTimes', { count: song.count })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
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
                <Trophy className="h-12 w-12 mb-3 opacity-50" />
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
                  className="group p-4 rounded-xl border border-gray-200/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
