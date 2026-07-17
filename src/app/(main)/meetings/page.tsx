'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Music, User } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

interface Meeting {
  id: string
  date: string
  theme: string | null
  speaker: string | null
  leader: string | null
  type: string
  songs: Array<{
    song: {
      id: string
      title: string
    }
  }>
}

export default function MeetingsPage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const meetingTypeLabels: Record<string, string> = {
    MORNING: t('meetings.morning'),
    AFTERNOON: t('meetings.afternoon'),
    EVENING: t('meetings.evening'),
  }
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('')
  const [years, setYears] = useState<number[]>([])
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchMeetings()
  }, [year, month, page])

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (month) {
        params.append('month', month)
      } else if (year) {
        params.append('year', year)
      }

      const response = await fetch(`/api/meetings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data.meetings)
        setTotalPages(data.pagination.pages)
        setYears(data.years || [])
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('meetings.title')}</h1>
          <p className="text-muted-foreground">{t('meetings.subtitle')}</p>
        </div>
        <Link href="/meetings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('meetings.newMeeting')}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setMonth('')
            setPage(1)
          }}
          className="h-10 px-3 border rounded-md appearance-none bg-white"
          aria-label={t('meetings.selectYear')}
        >
          <option value="">{t('meetings.allYears')}</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {t('meetings.yearOption', { year: y })}
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value)
              setYear('')
              setPage(1)
            }}
            className="w-48"
          />
        </div>

        {(year || month) && (
          <Button
            variant="ghost"
            onClick={() => {
              setYear('')
              setMonth('')
              setPage(1)
            }}
          >
            {t('meetings.clearFilters')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('meetings.noMeetings')}</p>
            <Link href="/meetings/new" className="mt-4">
              <Button variant="outline">{t('meetings.createFirst')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {format(new Date(meeting.date), 'PPP', {
                          locale: dateLocale,
                        })}
                      </CardTitle>
                      {meeting.theme && (
                        <CardDescription className="mt-1">
                          {meeting.theme}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {meetingTypeLabels[meeting.type] || meeting.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {meeting.speaker && (
                      <div className="flex items-center">
                        <User className="mr-1 h-4 w-4" />
                        {t('meetings.speaker', { name: meeting.speaker })}
                      </div>
                    )}
                    {meeting.leader && (
                      <div className="flex items-center">
                        <User className="mr-1 h-4 w-4" />
                        {t('meetings.leader', { name: meeting.leader })}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Music className="mr-1 h-4 w-4" />
                      {t('meetings.songCount', { count: meeting.songs.length })}
                    </div>
                  </div>
                  {meeting.songs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meeting.songs.slice(0, 5).map((item) => (
                        <Badge key={item.song.id} variant="outline">
                          {item.song.title}
                        </Badge>
                      ))}
                      {meeting.songs.length > 5 && (
                        <Badge variant="outline">
                          +{meeting.songs.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            {t('meetings.prevPage')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('meetings.pageOf', { page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            {t('meetings.nextPage')}
          </Button>
        </div>
      )}
    </div>
  )
}
