'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Edit, Trash, FileText, Music2, Calendar, Download,
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat,
  Shuffle, Heart, Share2, ListMusic, Disc3, Mic2, Clock, Video, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { ShareButton } from '@/components/share-button'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'

interface Song {
  id: string
  title: string
  artist: string | null
  key: string | null
  timeSignature: string | null
  composer: string | null
  lyricist: string | null
  team: string | null
  album: string | null
  mvUrl: string | null
  sheetMusic: string | null
  audioFile: string | null
  lyrics: string | null
  notes: string | null
  category: {
    id: string
    name: string
  }
  meetings: Array<{
    meeting: {
      id: string
      date: string
      theme: string | null
      leader: string | null
    }
  }>
}

export default function SongDetailPage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const params = useParams()
  const router = useRouter()
  const permissions = usePermissions()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isLiked, setIsLiked] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
  const [showLyrics, setShowLyrics] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSong()
  }, [params.id])

  useEffect(() => {
    if (song?.lyrics && isPlaying) {
      updateCurrentLyric()
    }
  }, [currentTime, song?.lyrics, isPlaying])

  const fetchSong = async () => {
    try {
      const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
      const response = await fetch(`/api/songs/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSong(data)
      } else {
        router.push('/songs')
      }
    } catch (error) {
      console.error('Failed to fetch song:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!permissions.canDeleteSong) {
      toast.error(t('songs.noPermissionDelete'))
      return
    }

    if (!confirm(t('songs.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    try {
      const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
      const response = await fetch(`/api/songs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(t('songs.deleted'))
        router.push('/songs')
      } else {
        const data = await response.json()
        toast.error(data.error || t('songs.deleteFailed'))
      }
    } catch (error) {
      console.error('Failed to delete song:', error)
      toast.error(t('songs.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  // 音频播放控制
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.volume = vol
      setVolume(vol)
      setIsMuted(vol === 0)
    }
  }

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration)
    }
  }

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 解析songs.lyrics
  const parseLyrics = (lyrics: string) => {
    if (!lyrics) return []
    const lines = lyrics.split('\n').filter(line => line.trim())
    return lines.map((line, index) => ({
      text: line.trim(),
      index,
    }))
  }

  // 更新当前songs.lyrics行
  const updateCurrentLyric = () => {
    if (!song?.lyrics) return
    const lines = parseLyrics(song.lyrics)
    if (lines.length === 0) return

    // 根据时间计算当前songs.lyrics行（假设每行songs.lyrics平均 5 秒）
    const avgTimePerLine = duration / lines.length
    const newIndex = Math.floor(currentTime / avgTimePerLine)

    if (newIndex !== currentLyricIndex && newIndex >= 0 && newIndex < lines.length) {
      setCurrentLyricIndex(newIndex)

      // 滚动到当前songs.lyrics
      if (lyricsRef.current) {
        const lyricElement = lyricsRef.current.children[newIndex] as HTMLElement
        if (lyricElement) {
          lyricElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }
    }
  }

  // 获取songs.category颜色
  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      '敬拜赞美': 'from-pink-500 to-rose-500',
      '诗歌': 'from-violet-500 to-purple-500',
      '圣诞诗歌': 'from-red-500 to-green-500',
      '复活节诗歌': 'from-amber-500 to-yellow-500',
      '圣餐诗歌': 'from-blue-500 to-indigo-500',
      '其他': 'from-gray-500 to-slate-500',
    }
    return colors[categoryName] || 'from-gray-500 to-slate-500'
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="animate-pulse border-0 shadow-sm">
              <CardContent className="p-8">
                <div className="aspect-square skeleton rounded-2xl" />
              </CardContent>
            </Card>
          </div>
          <Card className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-24 skeleton rounded" />
                <div className="h-40 w-full skeleton rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!song) {
    return null
  }

  const lyrics = song.lyrics ? parseLyrics(song.lyrics) : []

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center space-x-4">
          <Link href="/songs">
            <Button variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('songs.back')}
            </Button>
          </Link>
          <div>
            <Badge variant="secondary" className="mb-2">
              {song.category.name}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="gradient-text">{song.title}</span>
            </h1>
            {song.artist && (
              <p className="text-muted-foreground mt-1 flex items-center">
                <Mic2 className="h-4 w-4 mr-1" />
                {song.artist}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <ShareButton type="song" id={song.id} />
          {permissions.canEditSong && (
            <Link href={`/songs/${song.id}/edit`}>
              <Button variant="outline" className="rounded-xl">
                <Edit className="mr-2 h-4 w-4" />
                {t('songs.edit')}
              </Button>
            </Link>
          )}
          {permissions.canDeleteSong && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl"
            >
              <Trash className="mr-2 h-4 w-4" />
              {deleting ? t('songs.deleting') : t('songs.delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：专辑封面和播放器 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 专辑封面 */}
          <Card className="animate-fade-in border-0 shadow-lg overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className={`bg-gradient-to-br ${getCategoryColor(song.category.name)} p-8`}>
              <div className="aspect-square max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-sm">
                {song.sheetMusic ? (
                  <img
                    src={song.sheetMusic}
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-black/30 to-black/50">
                    <Disc3 className={`h-32 w-32 text-white/80 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                    <p className="text-white/90 text-xl font-bold mt-4">{song.title}</p>
                    {song.artist && (
                      <p className="text-white/70 mt-1">{song.artist}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 播放器 */}
          {song.audioFile && (
            <Card className="animate-fade-in border-0 shadow-lg" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-6">
                <audio
                  ref={audioRef}
                  src={song.audioFile}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => {
                    setIsPlaying(false)
                    if (isRepeat) {
                      audioRef.current?.play()
                      setIsPlaying(true)
                    }
                  }}
                />

                {/* 进度条 */}
                <div className="space-y-2 mb-6">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* 播放控制 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`rounded-lg ${isShuffle ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={`rounded-lg ${isRepeat ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipBackward}
                      className="rounded-lg"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white ml-0.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipForward}
                      className="rounded-lg"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsLiked(!isLiked)}
                      className={`rounded-lg ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="rounded-lg"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* songs.lyrics显示 */}
          {song.lyrics && (
            <Card className="animate-fade-in border-0 shadow-lg" style={{ animationDelay: '300ms' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <ListMusic className="h-4 w-4 text-white" />
                    </div>
                    <span>{t('songs.lyrics')}</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLyrics(!showLyrics)}
                    className="rounded-lg"
                  >
                    {showLyrics ? t('songs.collapseLyrics') : t('songs.expandLyrics')}
                  </Button>
                </div>
              </CardHeader>
              {showLyrics && (
                <CardContent>
                  <div
                    ref={lyricsRef}
                    className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-xl"
                  >
                    {lyrics.map((line, index) => (
                      <div
                        key={index}
                        className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                          index === currentLyricIndex
                            ? 'bg-primary text-primary-foreground font-bold text-lg scale-105'
                            : 'text-muted-foreground hover:bg-gray-100'
                        }`}
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* 右侧：songs.songInfo和songs.usageHistory */}
        <div className="space-y-6">
          {/* songs.songInfo */}
          <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span>{t('songs.songInfo')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('songs.category')}</span>
                <Badge variant="secondary" className="rounded-lg">
                  {song.category.name}
                </Badge>
              </div>
              {song.artist && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.artist')}</span>
                  <span className="font-medium">{song.artist}</span>
                </div>
              )}
              {song.key && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.key')}</span>
                  <span className="font-medium">{song.key}</span>
                </div>
              )}
              {song.timeSignature && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.timeSignature')}</span>
                  <span className="font-medium">{song.timeSignature}</span>
                </div>
              )}
              {song.composer && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.composer')}</span>
                  <span className="font-medium">{song.composer}</span>
                </div>
              )}
              {song.lyricist && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.lyricist')}</span>
                  <span className="font-medium">{song.lyricist}</span>
                </div>
              )}
              {song.team && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.team')}</span>
                  <span className="font-medium">{song.team}</span>
                </div>
              )}
              {song.album && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.album')}</span>
                  <span className="font-medium">{song.album}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('songs.usageCount')}</span>
                <div className="flex items-center space-x-1">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('songs.times', { count: song.meetings.length })}</span>
                </div>
              </div>
              {song.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.notes')}</span>
                  <p className="mt-1 text-sm">{song.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* songs.attachments */}
          <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span>{t('songs.attachments')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {song.sheetMusic && (
                <a
                  href={song.sheetMusic}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">{t('songs.viewSheet')}</span>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {song.audioFile && (
                <a
                  href={song.audioFile}
                  download
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Music2 className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">{t('songs.downloadAudio')}</span>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
              {song.mvUrl && (
                <a
                  href={song.mvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium">{t('songs.watchMv')}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* songs.usageHistory */}
          <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span>{t('songs.usageHistory')}</span>
              </CardTitle>
              <CardDescription>{t('songs.recentUsage')}</CardDescription>
            </CardHeader>
            <CardContent>
              {song.meetings.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {song.meetings.slice(0, 10).map((item, index) => (
                    <Link
                      key={index}
                      href={`/meetings/${item.meeting.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {format(new Date(item.meeting.date), 'PPP', {
                              locale: dateLocale,
                            })}
                          </p>
                          {item.meeting.theme && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.meeting.theme}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.meeting.leader && (
                        <span className="text-xs text-muted-foreground">
                          {item.meeting.leader}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">{t('songs.noUsage')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
