'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Music, Calendar, User, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

interface SharedData {
  id: string
  title?: string
  artist?: string | null
  category?: { name: string }
  date?: string
  theme?: string | null
  speaker?: string | null
  leader?: string | null
  songs?: Array<{
    song: {
      id: string
      title: string
      artist: string | null
    }
    order: number
  }>
}

export default function SharePage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const params = useParams()
  const searchParams = useSearchParams()
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSharedData()
  }, [params.type, params.id])

  const fetchSharedData = async () => {
    try {
      const token = searchParams.get('token')
      const response = await fetch(
        `/api/share?type=${params.type}&id=${params.id}&token=${token}`
      )

      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        setError(t('share.invalid'))
      }
    } catch (error) {
      console.error('Failed to fetch shared data:', error)
      setError(t('share.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {params.type === 'song' ? data.title : t('share.meetingRecord')}
            </CardTitle>
            <CardDescription>
              {t('share.sharedBy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {params.type === 'song' && data.category && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Music className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('share.songInfo')}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('share.category')}</span>
                    <div className="mt-1">
                      <Badge>{data.category.name}</Badge>
                    </div>
                  </div>
                  {data.artist && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('share.artist')}</span>
                      <p className="mt-1">{data.artist}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {params.type === 'meeting' && data.date && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('share.meetingInfo')}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('share.date')}</span>
                    <p className="mt-1">
                      {format(new Date(data.date), 'PPP', {
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                  {data.theme && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('share.theme')}</span>
                      <p className="mt-1">{data.theme}</p>
                    </div>
                  )}
                  {data.speaker && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('share.speaker')}</span>
                      <p className="mt-1">{data.speaker}</p>
                    </div>
                  )}
                  {data.leader && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('share.leader')}</span>
                      <p className="mt-1">{data.leader}</p>
                    </div>
                  )}
                </div>

                {data.songs && data.songs.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Music className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{t('share.songList')}</span>
                    </div>
                    <div className="space-y-2">
                      {data.songs.map((item) => (
                        <div
                          key={item.song.id}
                          className="flex items-center space-x-3 p-2 bg-gray-50 rounded"
                        >
                          <span className="text-lg font-bold text-muted-foreground w-8 text-center">
                            {item.order}
                          </span>
                          <div>
                            <p className="font-medium">{item.song.title}</p>
                            {item.song.artist && (
                              <p className="text-sm text-muted-foreground">
                                {item.song.artist}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
