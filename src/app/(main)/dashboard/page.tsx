'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Music,
  Calendar,
  Users,
  TrendingUp,
  ListMusic,
  FileText,
  Presentation,
  BookOpen,
  Church,
  ScrollText,
  ArrowUpRight,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { useI18n } from '@/components/providers/i18n-provider'
import { usePermissions } from '@/hooks/use-permissions'

interface LatestMeeting {
  id: string
  date: string
  theme: string | null
  speaker: string | null
  leader: string | null
  type: string
  songCount: number
  songs: Array<{ id: string; title: string }>
}

interface DashboardStats {
  totalSongs: number
  totalMeetings: number
  totalCategories: number
  latestMeeting: LatestMeeting | null
}

const MEETING_TYPE_KEYS: Record<string, string> = {
  MORNING: 'meetings.morning',
  AFTERNOON: 'meetings.afternoon',
  EVENING: 'meetings.evening',
}

export default function DashboardPage() {
  const { t, locale } = useI18n()
  const permissions = usePermissions()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    totalMeetings: 0,
    totalCategories: 0,
    latestMeeting: null,
  })
  const [loading, setLoading] = useState(true)

  const statCards = [
    {
      title: t('dashboard.totalSongs'),
      icon: Music,
      value: stats.totalSongs,
    },
    {
      title: t('dashboard.totalMeetings'),
      icon: Calendar,
      value: stats.totalMeetings,
    },
    {
      title: t('dashboard.totalCategories'),
      icon: Users,
      value: stats.totalCategories,
    },
  ]

  const quickActions = useMemo(
    () =>
      [
        {
          title: t('dashboard.browseSongs'),
          description: t('dashboard.browseSongsDesc'),
          href: '/songs',
          icon: Music,
          show: true,
        },
        {
          title: t('dashboard.newMeeting'),
          description: t('dashboard.newMeetingDesc'),
          href: '/meetings/new',
          icon: Calendar,
          show: permissions.canCreateMeeting,
        },
        {
          title: t('dashboard.sheets'),
          description: t('dashboard.sheetsDesc'),
          href: '/sheets',
          icon: FileText,
          show: true,
        },
        {
          title: t('dashboard.playlists'),
          description: t('dashboard.playlistsDesc'),
          href: '/playlists',
          icon: ListMusic,
          show: true,
        },
        {
          title: t('dashboard.ppt'),
          description: t('dashboard.pptDesc'),
          href: '/ppt',
          icon: Presentation,
          show: true,
        },
        {
          title: t('dashboard.importData'),
          description: t('dashboard.importDataDesc'),
          href: '/data',
          icon: TrendingUp,
          show: permissions.isLeaderOrAbove,
        },
        {
          title: t('dashboard.viewGuide'),
          description: t('dashboard.viewGuideDesc'),
          href: '/guide',
          icon: BookOpen,
          show: true,
        },
      ].filter((action) => action.show),
    [permissions.canCreateMeeting, permissions.isLeaderOrAbove, t]
  )

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

  const meetingTypeLabel = (type: string) => {
    const key = MEETING_TYPE_KEYS[type]
    return key ? t(key) : type
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-4 w-64 skeleton rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-32 skeleton rounded-lg" />
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

      <div className="animate-fade-in flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm">
        {statCards.map((card) => (
          <div key={card.title} className="flex items-center gap-2">
            <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{card.title}</span>
            <span className="font-semibold tabular-nums">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t('dashboard.latestMeeting')}</CardTitle>
                <CardDescription>{t('dashboard.latestMeetingDesc')}</CardDescription>
              </div>
              <Link
                href="/meetings"
                className="flex items-center text-sm text-primary hover:underline"
              >
                {t('dashboard.viewAllMeetings')}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.latestMeeting ? (
              <Link
                href={`/meetings/${stats.latestMeeting.id}`}
                className="group block rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                      {stats.latestMeeting.theme || t('meetings.noTheme')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(stats.latestMeeting.date), 'PPP', {
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary">{meetingTypeLabel(stats.latestMeeting.type)}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {stats.latestMeeting.speaker && (
                    <div className="flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      {t('meetings.speaker', { name: stats.latestMeeting.speaker })}
                    </div>
                  )}
                  {stats.latestMeeting.leader && (
                    <div className="flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      {t('meetings.leader', { name: stats.latestMeeting.leader })}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Music className="mr-1 h-4 w-4" />
                    {t('meetings.songCount', { count: stats.latestMeeting.songCount })}
                  </div>
                </div>

                {stats.latestMeeting.songs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stats.latestMeeting.songs.slice(0, 6).map((song) => (
                      <Badge key={song.id} variant="outline" className="font-normal">
                        {song.title}
                      </Badge>
                    ))}
                    {stats.latestMeeting.songs.length > 6 && (
                      <Badge variant="outline" className="font-normal">
                        {t('dashboard.moreSongs', {
                          count: stats.latestMeeting.songs.length - 6,
                        })}
                      </Badge>
                    )}
                  </div>
                )}
              </Link>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="mb-3 h-12 w-12 opacity-50" />
                <p>{t('dashboard.noMeeting')}</p>
                <p className="text-sm">{t('dashboard.noMeetingHint')}</p>
                {permissions.canCreateMeeting && (
                  <Link href="/meetings/new" className="mt-4 text-sm text-primary hover:underline">
                    {t('meetings.createFirst')}
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Church className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('dashboard.missionVision')}</CardTitle>
                <CardDescription>{t('dashboard.missionVisionDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="mb-2 text-sm font-semibold text-primary">{t('dashboard.mission')}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('dashboard.missionText')}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="mb-2 text-sm font-semibold text-primary">{t('dashboard.vision')}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('dashboard.visionText')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '450ms' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('dashboard.statementOfFaith')}</CardTitle>
              <CardDescription>{t('dashboard.apostlesCreedTitle')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/50 p-5 md:p-6">
            {t('dashboard.apostlesCreedText')
              .split('\n\n')
              .map((paragraph, index) => (
                <p
                  key={index}
                  className={`text-sm leading-relaxed text-muted-foreground md:text-base md:leading-loose${
                    index > 0 ? ' mt-4' : ''
                  }`}
                >
                  {paragraph}
                </p>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '500ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
          <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
  )
}
