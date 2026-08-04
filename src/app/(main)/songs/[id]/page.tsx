'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft, Edit, Trash, FileText, Music2, Download,
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat,
  Shuffle, Heart, ListMusic, ListPlus, Disc3, Mic2, Video, ExternalLink, Tags, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { requestExtractAndSaveLyrics } from '@/lib/extract-lyrics-client'
import { ShareButton } from '@/components/share-button'
import { SongTagBadges, type TagItem } from '@/components/tag-multi-select'
import { AddToPlaylistDialog } from '@/components/add-to-playlist-dialog'
import { EditSongTagsDialog } from '@/components/edit-song-tags-dialog'
import { SheetMusicPreviewDialog } from '@/components/sheet-music-preview-dialog'
import { SongAttachmentQuickUpload } from '@/components/song-attachment-quick-upload'
import { SongScripturesDisplay } from '@/components/song-scriptures-editor'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import { parseLrc } from '@/lib/lrc'
import { getRouteParamId, isSongDetailId, SONG_UPLOAD_PATH } from '@/lib/route-params'

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
  coverImage: string | null
  audioFile: string | null
  lyrics: string | null
  lyricsLrc: string | null
  notes: string | null
  sheetUploadedAt: string | null
  uploadedBy: { id: string; name: string | null; email: string } | null
  sheetUploadedBy: { id: string; name: string | null; email: string } | null
  tags: Array<{ tag: TagItem }>
  scriptures?: Array<{
    id: string
    reference: string
    text: string | null
    order: number
  }>
}

export default function SongDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const songId = getRouteParamId(params.id)
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
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false)
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false)
  const [sheetPreviewOpen, setSheetPreviewOpen] = useState(false)
  const [extractingLyrics, setExtractingLyrics] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const autoExtractAttemptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSongDetailId(songId)) {
      if (songId === 'upload') {
        router.replace(SONG_UPLOAD_PATH)
      } else if (songId === 'new') {
        router.replace('/songs/new')
      }
      return
    }

    let cancelled = false
    setSong(null)
    setLoading(true)

    const fetchSong = async () => {
      try {
        const response = await fetch(`/api/songs/${songId}`)
        if (cancelled) return

        if (response.ok) {
          const data = (await response.json()) as Song
          if (data?.id && data.title) {
            setSong(data)
          } else {
            toast.error(t('songs.songNotFound'))
            router.push('/songs')
          }
        } else {
          toast.error(t('songs.songNotFound'))
          router.push('/songs')
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch song:', error)
          toast.error(t('songs.loadFailed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchSong()

    return () => {
      cancelled = true
    }
  }, [songId, router, t])

  useEffect(() => {
    if (!song?.sheetMusic) return
    if (song.lyrics?.trim() || song.lyricsLrc?.trim()) return
    if (autoExtractAttemptedRef.current === song.id) return

    autoExtractAttemptedRef.current = song.id

    const autoExtract = async () => {
      setExtractingLyrics(true)
      toast.message(t('songs.autoExtractingLyrics'))
      try {
        const result = await requestExtractAndSaveLyrics(song.id)
        if (result.ok && result.lyrics.trim()) {
          setSong((prev) => (prev ? { ...prev, lyrics: result.lyrics } : prev))
          toast.success(t('songs.autoExtractSaved'))
        }
      } finally {
        setExtractingLyrics(false)
      }
    }

    void autoExtract()
  }, [song, t])

  const handleExtractAndSaveLyrics = async () => {
    if (!song) return
    setExtractingLyrics(true)
    try {
      const result = await requestExtractAndSaveLyrics(song.id)
      if (!result.ok) {
        toast.error(
          result.error === 'extractFailed'
            ? t('songs.extractFailed')
            : result.error,
        )
        return
      }
      if (!result.lyrics.trim()) {
        toast.error(t('songs.extractFailed'))
        return
      }
      setSong((prev) => (prev ? { ...prev, lyrics: result.lyrics } : prev))
      toast.success(t('songs.autoExtractSaved'))
    } finally {
      setExtractingLyrics(false)
    }
  }

  const fetchSong = async (options?: { silent?: boolean }) => {
    if (!isSongDetailId(songId)) return

    if (!options?.silent) setLoading(true)
    try {
      const response = await fetch(`/api/songs/${songId}`)
      if (response.ok) {
        const data = (await response.json()) as Song
        if (data?.id && data.title) {
          setSong(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch song:', error)
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }

  const handleAttachmentUploaded = () => {
    void fetchSong({ silent: true })
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
      const response = await fetch(`/api/songs/${songId}`, {
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

  // 按 LRC 时间轴更新当前行
  const updateCurrentLyric = () => {
    if (!song?.lyricsLrc) return
    const lines = parseLrc(song.lyricsLrc)
    if (lines.length === 0) return

    let newIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i]!.timeSec) {
        newIndex = i
      } else {
        break
      }
    }

    if (newIndex !== currentLyricIndex && newIndex >= 0) {
      setCurrentLyricIndex(newIndex)

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

  useEffect(() => {
    if (song?.lyricsLrc && isPlaying) {
      updateCurrentLyric()
    }
  }, [currentTime, song?.lyricsLrc, isPlaying])

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

  const lrcLines = song.lyricsLrc ? parseLrc(song.lyricsLrc) : []
  const plainLines = song.lyrics
    ? song.lyrics.split('\n').filter((line) => line.trim())
    : []
  const timedFollowAlong = lrcLines.length > 0

  return (
    <div key={songId} className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center space-x-4">
          <Link
            href="/songs"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-xl' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('songs.back')}
          </Link>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SongTagBadges
                tags={song.tags}
                {...(permissions.canEditSong
                  ? {
                      onTagClick: () => setTagsDialogOpen(true),
                      onUncategorizedClick: () => setTagsDialogOpen(true),
                    }
                  : {})}
              />
              {permissions.canEditSong && (
                <button
                  type="button"
                  onClick={() => setTagsDialogOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('songs.editTags')}
                </button>
              )}
            </div>
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
          {(permissions.canEditPlaylist || permissions.canCreatePlaylist) && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setAddToPlaylistOpen(true)}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              {t('playlists.addToPlaylist')}
            </Button>
          )}
          {permissions.canEditSong && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setTagsDialogOpen(true)}
            >
              <Tags className="mr-2 h-4 w-4" />
              {t('songs.editTags')}
            </Button>
          )}
          {permissions.canEditSong && (
            <Link
              href={`/songs/${song.id}/edit`}
              className={buttonVariants({ variant: 'outline', className: 'rounded-xl' })}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('songs.edit')}
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
            <div
              className={`bg-gradient-to-br ${getCategoryColor(song.tags?.find((st) => st.tag.kind === 'TYPE')?.tag.name || '')} p-8`}
            >
              <div className="aspect-square max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-sm">
                {song.coverImage ? (
                  <img
                    src={song.coverImage}
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
          {song.audioFile ? (
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
          ) : permissions.canEditSong ? (
            <Card className="animate-fade-in border-0 shadow-lg" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-6">
                <SongAttachmentQuickUpload
                  song={song}
                  kind="audio"
                  variant="card"
                  onUploaded={handleAttachmentUploaded}
                />
              </CardContent>
            </Card>
          ) : null}

        </div>

        {/* 右侧：歌曲信息与歌词 */}
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
              <button
                type="button"
                disabled={!permissions.canEditSong}
                onClick={() => {
                  if (permissions.canEditSong) setTagsDialogOpen(true)
                }}
                className={`flex w-full items-center justify-between rounded-xl bg-gray-50 p-3 text-left${
                  permissions.canEditSong
                    ? ' cursor-pointer hover:bg-gray-100'
                    : ''
                }`}
                title={
                  permissions.canEditSong ? t('songs.editTagsHint') : undefined
                }
              >
                <span className="text-sm text-muted-foreground">{t('songs.tags')}</span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <SongTagBadges tags={song.tags} />
                  {permissions.canEditSong && (
                    <span className="ml-1 text-xs text-primary">{t('songs.editTags')}</span>
                  )}
                </div>
              </button>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('songs.uploadedBy')}</span>
                <span className="font-medium text-sm">
                  {song.uploadedBy?.name || song.uploadedBy?.email || t('songs.unknownUploader')}
                </span>
              </div>
              {song.sheetMusic && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.sheetUploadedBy')}</span>
                  <span className="font-medium text-sm text-right">
                    {song.sheetUploadedBy?.name ||
                      song.sheetUploadedBy?.email ||
                      t('songs.unknownUploader')}
                  </span>
                </div>
              )}
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
              {song.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-muted-foreground">{t('songs.notes')}</span>
                  <p className="mt-1 text-sm">{song.notes}</p>
                </div>
              )}
              {song.scriptures && song.scriptures.length > 0 && (
                <SongScripturesDisplay scriptures={song.scriptures} t={t} />
              )}
            </CardContent>
          </Card>

          {/* 歌词 */}
          <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '250ms' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <ListMusic className="h-4 w-4 text-white" />
                  </div>
                  <span>{t('songs.lyrics')}</span>
                </CardTitle>
                {(timedFollowAlong || plainLines.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLyrics(!showLyrics)}
                    className="rounded-lg"
                  >
                    {showLyrics ? t('songs.collapseLyrics') : t('songs.expandLyrics')}
                  </Button>
                )}
              </div>
            </CardHeader>
            {showLyrics && (
              <CardContent className="space-y-4">
                {timedFollowAlong || plainLines.length > 0 ? (
                  <>
                    {timedFollowAlong ? (
                      <div
                        ref={lyricsRef}
                        className="max-h-80 overflow-y-auto space-y-2 rounded-xl bg-gray-50 p-4"
                      >
                        {lrcLines.map((line, index) => (
                          <div
                            key={`${line.timeSec}-${index}`}
                            className={`rounded-lg px-4 py-2 transition-all duration-300 ${
                              index === currentLyricIndex
                                ? 'scale-105 bg-primary text-lg font-bold text-primary-foreground'
                                : 'text-muted-foreground hover:bg-gray-100'
                            }`}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {plainLines.length > 0 && (
                      <div className={timedFollowAlong ? 'space-y-2' : undefined}>
                        {timedFollowAlong && (
                          <p className="text-sm font-medium text-muted-foreground">
                            {t('songs.plainLyrics')}
                          </p>
                        )}
                        <div
                          className={`max-h-80 overflow-y-auto space-y-2 rounded-xl bg-gray-50 p-4 ${
                            timedFollowAlong ? 'max-h-48' : ''
                          }`}
                        >
                          {plainLines.map((line, index) => (
                            <div
                              key={index}
                              className="rounded-lg px-4 py-2 text-muted-foreground"
                            >
                              {line.trim()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-8 text-center">
                    {extractingLyrics ? (
                      <>
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground/70" />
                        <p className="text-sm text-muted-foreground">
                          {t('songs.autoExtractingLyrics')}
                        </p>
                      </>
                    ) : (
                      <>
                        <ListMusic className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">{t('songs.noLyrics')}</p>
                        {song.sheetMusic && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 rounded-lg"
                            onClick={() => void handleExtractAndSaveLyrics()}
                          >
                            {t('songs.extractFromSheet')}
                          </Button>
                        )}
                        {permissions.canEditSong && (
                          <Link
                            href={`/songs/${song.id}/edit`}
                            className="mt-3 text-sm text-primary hover:underline"
                          >
                            {t('songs.addLyrics')}
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            )}
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
              {song.sheetMusic ? (
                <button
                  type="button"
                  onClick={() => setSheetPreviewOpen(true)}
                  className="flex w-full items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">{t('songs.viewSheet')}</span>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : permissions.canEditSong ? (
                <SongAttachmentQuickUpload
                  song={song}
                  kind="sheet"
                  onUploaded={handleAttachmentUploaded}
                />
              ) : null}
              {song.audioFile ? (
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
              ) : permissions.canEditSong ? (
                <SongAttachmentQuickUpload
                  song={song}
                  kind="audio"
                  onUploaded={handleAttachmentUploaded}
                />
              ) : null}
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
        </div>
      </div>

      <AddToPlaylistDialog
        songId={song.id}
        open={addToPlaylistOpen}
        onOpenChange={setAddToPlaylistOpen}
      />

      {permissions.canEditSong && (
        <EditSongTagsDialog
          open={tagsDialogOpen}
          onOpenChange={setTagsDialogOpen}
          song={song}
          onSaved={fetchSong}
        />
      )}

      <SheetMusicPreviewDialog
        open={sheetPreviewOpen}
        onOpenChange={setSheetPreviewOpen}
        path={song.sheetMusic}
      />
    </div>
  )
}
