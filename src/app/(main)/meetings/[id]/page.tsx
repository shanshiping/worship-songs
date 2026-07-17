'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash, Music, User, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { ShareButton } from '@/components/share-button'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

interface Meeting {
  id: string
  date: string
  theme: string | null
  speaker: string | null
  leader: string | null
  type: string
  notes: string | null
  songs: Array<{
    id: string
    order: number
    song: {
      id: string
      title: string
      artist: string | null
      category: {
        name: string
      }
    }
  }>
}

export default function MeetingDetailPage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const meetingTypeLabels: Record<string, string> = {
    MORNING: t('meetings.morning'),
    AFTERNOON: t('meetings.afternoon'),
    EVENING: t('meetings.evening'),
  }
  const meetingTypeColors: Record<string, string> = {
    MORNING: 'from-amber-500 to-orange-500',
    AFTERNOON: 'from-blue-500 to-cyan-500',
    EVENING: 'from-violet-500 to-purple-500',
  }
  const params = useParams()
  const router = useRouter()
  const permissions = usePermissions()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchMeeting()
  }, [params.id])

  const fetchMeeting = async () => {
    try {
      const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
      const response = await fetch(`/api/meetings/${id}`)
      if (response.ok) {
        const data = await response.json()
        setMeeting(data)
      } else {
        toast.error(t('meetings.loadFailed'))
        router.push('/meetings')
      }
    } catch (error) {
      console.error('Failed to fetch meeting:', error)
      toast.error(t('meetings.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!permissions.canDeleteMeeting) {
      toast.error(t('meetings.noPermissionDelete'))
      return
    }

    if (!confirm(t('meetings.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    try {
      const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(t('meetings.deleted'))
        router.push('/meetings')
      } else {
        const data = await response.json()
        toast.error(data.error || t('meetings.deleteFailed'))
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error)
      toast.error(t('meetings.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-20 skeleton rounded-xl" />
          <div className="space-y-2">
            <div className="h-8 w-48 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-24 skeleton rounded" />
                <div className="h-4 w-full skeleton rounded" />
                <div className="h-4 w-3/4 skeleton rounded" />
              </div>
            </CardContent>
          </Card>
          <Card className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-24 skeleton rounded" />
                <div className="h-20 w-full skeleton rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center space-x-4">
          <Link href="/meetings">
            <Button variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('meetings.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">
                {format(new Date(meeting.date), 'PPP', {
                  locale: dateLocale,
                })}
              </span>
            </h1>
            {meeting.theme && (
              <p className="text-muted-foreground mt-1 line-clamp-1">{meeting.theme}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <ShareButton type="meeting" id={meeting.id} />
          {permissions.canEditMeeting && (
            <Link href={`/meetings/${meeting.id}/edit`}>
              <Button variant="outline" className="rounded-xl">
                <Edit className="mr-2 h-4 w-4" />
                {t('meetings.edit')}
              </Button>
            </Link>
          )}
          {permissions.canDeleteMeeting && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl"
            >
              <Trash className="mr-2 h-4 w-4" />
              {deleting ? t('meetings.deleting') : t('meetings.delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* meetings.info */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span>{t('meetings.info')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-muted-foreground">{t('meetings.typeLabel')}</span>
              <Badge
                variant="secondary"
                className={`bg-gradient-to-r ${meetingTypeColors[meeting.type] || 'from-gray-500 to-slate-500'} text-white border-0`}
              >
                {meetingTypeLabels[meeting.type] || meeting.type}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-muted-foreground">{t('meetings.dateLabel')}</span>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(meeting.date), 'yyyy-MM-dd')}
                </span>
              </div>
            </div>
            {meeting.speaker && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('meetings.speakerLabel')}</span>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{meeting.speaker}</span>
                </div>
              </div>
            )}
            {meeting.leader && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('meetings.leaderLabel')}</span>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{meeting.leader}</span>
                </div>
              </div>
            )}
            {meeting.notes && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('meetings.notes')}</span>
                <p className="mt-1 text-sm">{meeting.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* meetings.songList */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Music className="h-4 w-4 text-white" />
              </div>
              <span>{t('meetings.songList')}</span>
            </CardTitle>
            <CardDescription>{t('meetings.songListDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {meeting.songs.length > 0 ? (
              <div className="space-y-3">
                {meeting.songs.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/songs/${item.song.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                        {item.order}
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {item.song.title}
                        </p>
                        {item.song.artist && (
                          <p className="text-sm text-muted-foreground">
                            {item.song.artist}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg">
                      {item.song.category?.name || t('meetings.uncategorized')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mb-3 opacity-50" />
                <p>{t('meetings.noSongs')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
