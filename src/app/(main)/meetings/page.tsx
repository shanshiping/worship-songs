'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Music, User } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

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

const meetingTypeLabels: Record<string, string> = {
  MORNING: '上午聚会',
  AFTERNOON: '下午聚会',
  EVENING: '晚间聚会',
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchMeetings()
  }, [month, page])

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (month) params.append('month', month)

      const response = await fetch(`/api/meetings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMeetings(data.meetings)
        setTotalPages(data.pagination.pages)
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
          <h1 className="text-3xl font-bold tracking-tight">聚会记录</h1>
          <p className="text-muted-foreground">管理所有聚会记录</p>
        </div>
        <Link href="/meetings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建聚会
          </Button>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value)
              setPage(1)
            }}
            className="w-48"
          />
        </div>
        {month && (
          <Button
            variant="ghost"
            onClick={() => {
              setMonth('')
              setPage(1)
            }}
          >
            清除筛选
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
            <p className="text-muted-foreground">暂无聚会记录</p>
            <Link href="/meetings/new" className="mt-4">
              <Button variant="outline">创建第一个聚会</Button>
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
                        {format(new Date(meeting.date), 'yyyy年MM月dd日 EEEE', {
                          locale: zhCN,
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
                        讲员: {meeting.speaker}
                      </div>
                    )}
                    {meeting.leader && (
                      <div className="flex items-center">
                        <User className="mr-1 h-4 w-4" />
                        主领: {meeting.leader}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Music className="mr-1 h-4 w-4" />
                      {meeting.songs.length} 首诗歌
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
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} 页，共 {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
