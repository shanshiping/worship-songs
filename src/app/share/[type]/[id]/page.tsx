'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Music, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { SongTagBadges, type TagItem } from '@/components/tag-multi-select'
import { SongScripturesDisplay } from '@/components/song-scriptures-editor'

interface SharedSong {
  id: string
  title?: string
  artist?: string | null
  key?: string | null
  timeSignature?: string | null
  composer?: string | null
  lyricist?: string | null
  lyrics?: string | null
  sheetMusic?: string | null
  audioFile?: string | null
  mvUrl?: string | null
  tags?: Array<{ tag: TagItem }>
  category?: { name: string }
  scriptures?: Array<{
    id?: string
    reference: string
    text?: string | null
    order?: number
  }>
}

interface SharedData {
  id: string
  title?: string
  description?: string | null
  artist?: string | null
  category?: { name: string }
  tags?: Array<{ tag: TagItem }>
  key?: string | null
  timeSignature?: string | null
  lyrics?: string | null
  sheetMusic?: string | null
  audioFile?: string | null
  mvUrl?: string | null
  date?: string
  theme?: string | null
  speaker?: string | null
  leader?: string | null
  songs?: Array<{
    song: SharedSong
    order: number
  }>
}

function FullSongBlock({
  song,
  t,
}: {
  song: SharedSong
  t: (key: string) => string
}) {
  return (
    <div className="space-y-3 border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">{song.title}</h3>
          {song.artist && (
            <p className="text-sm text-muted-foreground">{song.artist}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <SongTagBadges tags={song.tags} />
          {song.category && !song.tags?.length && (
            <Badge>{song.category.name}</Badge>
          )}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 text-sm">
        {song.key && (
          <div>
            <span className="text-muted-foreground">{t('songs.key')}: </span>
            {song.key}
          </div>
        )}
        {song.timeSignature && (
          <div>
            <span className="text-muted-foreground">{t('songs.timeSignature')}: </span>
            {song.timeSignature}
          </div>
        )}
        {song.composer && (
          <div>
            <span className="text-muted-foreground">{t('songs.composer')}: </span>
            {song.composer}
          </div>
        )}
        {song.lyricist && (
          <div>
            <span className="text-muted-foreground">{t('songs.lyricist')}: </span>
            {song.lyricist}
          </div>
        )}
      </div>
      {song.lyrics && (
        <pre className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-60 overflow-y-auto">
          {song.lyrics}
        </pre>
      )}
      {song.scriptures && song.scriptures.length > 0 && (
        <SongScripturesDisplay scriptures={song.scriptures} t={t} />
      )}
      {song.sheetMusic && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('songs.sheetPreview')}</p>
          {song.sheetMusic.toLowerCase().includes('.pdf') ? (
            <iframe
              title={t('songs.sheetPreview')}
              src={song.sheetMusic}
              className="h-80 w-full rounded border"
            />
          ) : (
            <img
              src={song.sheetMusic}
              alt={t('songs.sheetFile')}
              className="max-h-80 w-auto rounded border object-contain"
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center text-sm">
        {song.mvUrl && (
          <a href={song.mvUrl} target="_blank" rel="noreferrer" className="text-primary underline">
            MV
          </a>
        )}
        {song.audioFile && (
          <audio controls src={song.audioFile} className="h-8 max-w-xs" />
        )}
      </div>
    </div>
  )
}

export default function SharePage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const params = useParams()
  const searchParams = useSearchParams()
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const type = params.type as string

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
        setData(await response.json())
      } else {
        setError(t('share.invalid'))
      }
    } catch (err) {
      console.error('Failed to fetch shared data:', err)
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

  if (!data) return null

  const heading =
    type === 'song'
      ? data.title
      : type === 'playlist'
        ? data.title
        : t('share.meetingRecord')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{heading}</CardTitle>
            <CardDescription>
              {type === 'playlist'
                ? t('share.playlistRecord')
                : t('share.sharedBy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {type === 'song' && (
              <FullSongBlock song={data as SharedSong} t={t} />
            )}

            {type === 'playlist' && (
              <div className="space-y-4">
                {data.description && (
                  <p className="text-muted-foreground">{data.description}</p>
                )}
                {(data.songs || []).map((item) => (
                  <div key={`${item.order}-${item.song.id}`} className="space-y-1">
                    <p className="text-sm text-muted-foreground">#{item.order}</p>
                    <FullSongBlock song={item.song} t={t} />
                  </div>
                ))}
              </div>
            )}

            {type === 'meeting' && data.date && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('share.meetingInfo')}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('share.date')}</span>
                    <p className="mt-1">
                      {format(new Date(data.date), 'PPP', { locale: dateLocale })}
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
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Music className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t('share.songList')}</span>
                  </div>
                  {(data.songs || []).map((item) => (
                    <div key={item.song.id} className="flex items-center gap-2 p-2 bg-muted/40 rounded">
                      <span className="text-muted-foreground w-6">{item.order}</span>
                      <span>{item.song.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
