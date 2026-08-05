'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthYearPicker } from '@/components/month-year-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')
  const [leader, setLeader] = useState('')
  const [leaders, setLeaders] = useState<string[]>([])
  const [years, setYears] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchMeetings()
  }, [month, leader, page])

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (/^\d{4}$/.test(month)) {
        params.append('year', month)
      } else if (month) {
        params.append('month', month)
      }

      if (leader) {
        params.append('leader', leader)
      }

      const response = await fetch(`/api/meetings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data.meetings)
        setTotalPages(data.pagination.pages)
        setYears(data.years || [])
        setLeaders(data.leaders || [])
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
        <MonthYearPicker
          value={month}
          years={years}
          t={t}
          onChange={(next) => {
            setMonth(next)
            setPage(1)
          }}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leader-filter" className="text-xs text-muted-foreground">
            {t('meetings.filterByLeader')}
          </Label>
          <Select
            value={leader || 'all'}
            onValueChange={(value) => {
              setLeader(!value || value === 'all' ? '' : value)
              setPage(1)
            }}
          >
            <SelectTrigger id="leader-filter" className="min-w-[10rem]">
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

        {(month || leader) && (
          <Button
            variant="ghost"
            className="mb-0.5"
            onClick={() => {
              setMonth('')
              setLeader('')
              setPage(1)
            }}
          >
            {t('meetings.clearFilters')}
          </Button>
        )}
        </div>
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
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-semibold leading-snug">
                      {meeting.theme || t('meetings.noTheme')}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {format(new Date(meeting.date), 'PPP', {
                        locale: dateLocale,
                      })}
                    </CardDescription>
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
