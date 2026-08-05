'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Music, FileText, X, CheckCircle, Presentation } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'
import { requestExtractedLyrics } from '@/lib/extract-lyrics-client'
import { TagMultiSelect, type TagItem } from '@/components/tag-multi-select'
import {
  SongScripturesEditor,
  draftsFromScriptures,
  scripturesForSubmit,
  type ScriptureDraft,
} from '@/components/song-scriptures-editor'
import { getRouteParamId } from '@/lib/route-params'
import { getSongSheetPaths } from '@/lib/song-sheet-paths'
import {
  SheetMusicPagesEditor,
  type SheetMusicPageFile,
} from '@/components/sheet-music-pages-editor'

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
  sheetMusicPages?: string[] | null
  coverImage: string | null
  pptBackground: string | null
  audioFile: string | null
  lyrics: string | null
  lyricsLrc: string | null
  notes: string | null
  tags?: Array<{ tag: TagItem }>
  scriptures?: Array<{
    id: string
    reference: string
    text: string | null
    order: number
  }>
}

interface UploadedFile {
  path: string
  name: string
  size: number
  type: string
}

const KEY_PRESETS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
]
const TIME_SIGNATURE_PRESETS = ['4/4', '3/4', '6/8', '2/4', '12/8', '2/2', '3/8', '9/8']

export default function EditSongPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const songId = getRouteParamId(params.id)
  const [song, setSong] = useState<Song | null>(null)
  const [typeTags, setTypeTags] = useState<TagItem[]>([])
  const [styleTags, setStyleTags] = useState<TagItem[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [scriptures, setScriptures] = useState<ScriptureDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    key: '',
    timeSignature: '',
    composer: '',
    lyricist: '',
    team: '',
    album: '',
    mvUrl: '',
    lyrics: '',
    lyricsLrc: '',
    notes: '',
  })
  const [sheetMusicPages, setSheetMusicPages] = useState<SheetMusicPageFile[]>([])
  const [coverImage, setCoverImage] = useState<UploadedFile | null>(null)
  const [pptBackground, setPptBackground] = useState<UploadedFile | null>(null)
  const [audioFile, setAudioFile] = useState<UploadedFile | null>(null)
  const [uploadingSheet, setUploadingSheet] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingPptBackground, setUploadingPptBackground] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [extractingLyrics, setExtractingLyrics] = useState(false)

  useEffect(() => {
    fetchData()
  }, [songId])

  const fetchData = async () => {
    if (!songId) return

    try {
      const [songRes, tagsRes] = await Promise.all([
        fetch(`/api/songs/${songId}`),
        fetch('/api/tags'),
      ])

      if (songRes.ok) {
        const songData = await songRes.json()
        setSong(songData)
        setFormData({
          title: songData.title || '',
          artist: songData.artist || '',
          key: songData.key || '',
          timeSignature: songData.timeSignature || '',
          composer: songData.composer || '',
          lyricist: songData.lyricist || '',
          team: songData.team || '',
          album: songData.album || '',
          mvUrl: songData.mvUrl || '',
          lyrics: songData.lyrics || '',
          lyricsLrc: songData.lyricsLrc || '',
          notes: songData.notes || '',
        })
        setTagIds(
          (songData.tags || []).map((st: { tag: TagItem }) => st.tag.id)
        )
        setScriptures(draftsFromScriptures(songData.scriptures))
        const paths = getSongSheetPaths(songData)
        if (paths.length > 0) {
          setSheetMusicPages(
            paths.map((path, index) => ({
              path,
              name: t('songs.sheetPageLabel', { page: index + 1 }),
              size: 0,
              type: path.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
            })),
          )
        }
        if (songData.coverImage) {
          setCoverImage({
            path: songData.coverImage,
            name: t('songs.coverFile'),
            size: 0,
            type: 'image/jpeg',
          })
        }
        if (songData.pptBackground) {
          setPptBackground({
            path: songData.pptBackground,
            name: t('songs.existingPptBackground'),
            size: 0,
            type: 'image/jpeg',
          })
        }
        if (songData.audioFile) {
          setAudioFile({
            path: songData.audioFile,
            name: t('songs.existingAudio'),
            size: 0,
            type: 'audio/mpeg',
          })
        }
      } else {
        toast.error(t('songs.songNotFound'))
        router.push('/songs')
        return
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        const tags = (tagsData.tags || []) as TagItem[]
        setTypeTags(tags.filter((tag) => tag.kind === 'TYPE'))
        setStyleTags(tags.filter((tag) => tag.kind === 'STYLE'))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error(t('songs.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 上传文件
  const uploadFile = async (file: File, type: 'sheet' | 'audio' | 'cover' | 'pptBackground') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || t('songs.uploadFailed'))
    }

    return response.json()
  }

  const uploadSheetFiles = async (files: File[]): Promise<SheetMusicPageFile[]> => {
    setUploadingSheet(true)
    const uploaded: SheetMusicPageFile[] = []
    try {
      for (const file of files) {
        const result = (await uploadFile(file, 'sheet')) as SheetMusicPageFile
        uploaded.push(result)
      }
      if (uploaded.length > 0) {
        toast.success(t('songs.sheetUploadSuccess'))
        void autoExtractLyricsAfterSheetUpload(uploaded[0].path)
      }
      return uploaded
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.sheetUploadFailed')))
      return []
    } finally {
      setUploadingSheet(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    try {
      const result = await uploadFile(file, 'cover')
      setCoverImage(result)
      toast.success(t('songs.uploadSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.uploadFailed')))
    } finally {
      setUploadingCover(false)
    }
  }

  const handlePptBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPptBackground(true)
    try {
      const result = await uploadFile(file, 'pptBackground')
      setPptBackground(result)
      toast.success(t('songs.uploadSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.uploadFailed')))
    } finally {
      setUploadingPptBackground(false)
    }
  }

  // 处理songs.audioFile变化
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const result = await uploadFile(file, 'audio')
      setAudioFile(result)
      toast.success(t('songs.audioUploadSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('songs.audioUploadFailed')))
    } finally {
      setUploadingAudio(false)
    }
  }

  const removeCoverImage = () => {
    setCoverImage(null)
  }

  const removePptBackground = () => {
    setPptBackground(null)
  }

  const useCoverAsPptBackground = () => {
    if (!coverImage) return
    setPptBackground(coverImage)
    toast.success(t('songs.uploadSuccess'))
  }

  const removeAudioFile = () => {
    setAudioFile(null)
  }

  const handleExtractLyrics = async (sheetPath = sheetMusicPages[0]?.path) => {
    if (!sheetPath) return
    if (formData.lyrics.trim()) {
      const ok = window.confirm(t('songs.extractConfirmOverwrite'))
      if (!ok) return
    }
    setExtractingLyrics(true)
    try {
      const result = await requestExtractedLyrics(sheetPath)
      if (!result.ok) {
        toast.error(
          result.error === 'extractFailed'
            ? t('songs.extractFailed')
            : result.error,
        )
        return
      }
      setFormData((prev) => ({ ...prev, lyrics: result.lyrics }))
      toast.success(t('songs.extractSuccess'))
    } finally {
      setExtractingLyrics(false)
    }
  }

  const autoExtractLyricsAfterSheetUpload = async (sheetPath: string) => {
    if (formData.lyrics.trim()) return

    setExtractingLyrics(true)
    toast.message(t('songs.autoExtractingLyrics'))
    try {
      const result = await requestExtractedLyrics(sheetPath)
      if (!result.ok) return
      if (!result.lyrics.trim()) return
      setFormData((prev) => ({ ...prev, lyrics: result.lyrics }))
      toast.success(t('songs.autoExtractSuccess'))
    } finally {
      setExtractingLyrics(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error(t('songs.enterTitle'))
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tagIds,
          scriptures: scripturesForSubmit(scriptures),
          coverImage: coverImage?.path || null,
          pptBackground: pptBackground?.path || null,
          sheetMusic: sheetMusicPages[0]?.path || null,
          sheetMusicPages: sheetMusicPages.map((page) => page.path),
          audioFile: audioFile?.path || null,
        }),
      })

      if (response.ok) {
        toast.success(t('songs.updateSuccess'))
        router.push(`/songs/${songId}`)
      } else {
        const data = await response.json()
        toast.error(data.error || t('songs.updateFailed'))
      }
    } catch (error) {
      console.error('Failed to update song:', error)
      toast.error(t('songs.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
        <Card className="animate-pulse border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-10 w-full skeleton rounded-xl" />
              <div className="h-10 w-full skeleton rounded-xl" />
              <div className="h-32 w-full skeleton rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!song) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center space-x-4 animate-fade-in">
        <Link href={`/songs/${song.id}`}>
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('songs.back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">{t('songs.editTitle')}</span>
          </h1>
          <p className="text-muted-foreground">{song.title}</p>
        </div>
      </div>

      <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle>{t('songs.songInfo')}</CardTitle>
          <CardDescription>{t('songs.editDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 文件上传区域 */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* 封面上传 */}
              <div className="space-y-2">
                <Label htmlFor="coverImage">{t('songs.coverFile')}</Label>
                {coverImage ? (
                  <div className="space-y-2">
                    <img
                      src={coverImage.path}
                      alt={coverImage.name}
                      className="h-32 w-full rounded-xl object-cover"
                    />
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm font-medium text-green-900 truncate max-w-[140px]">
                        {coverImage.name}
                      </p>
                      <button
                        type="button"
                        onClick={removeCoverImage}
                        className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleCoverChange}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                    <label
                      htmlFor="coverImage"
                      className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer min-h-[140px]"
                    >
                      {uploadingCover ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{t('songs.uploading')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground text-center">
                          <Music className="h-8 w-8" />
                          <span className="text-sm">{t('songs.dropCover')}</span>
                          <span className="text-xs">{t('songs.dropCoverHint')}</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* PPT 背景 */}
              <div className="space-y-2">
                <Label htmlFor="pptBackground">{t('songs.pptBackgroundFile')}</Label>
                {pptBackground ? (
                  <div className="space-y-2">
                    <img
                      src={pptBackground.path}
                      alt={pptBackground.name}
                      className="h-32 w-full rounded-xl object-cover"
                    />
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm font-medium text-green-900 truncate max-w-[140px]">
                        {pptBackground.name}
                      </p>
                      <button
                        type="button"
                        onClick={removePptBackground}
                        className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-green-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative space-y-2">
                    <Input
                      id="pptBackground"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handlePptBackgroundChange}
                      className="hidden"
                      disabled={uploadingPptBackground}
                    />
                    <label
                      htmlFor="pptBackground"
                      className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer min-h-[140px]"
                    >
                      {uploadingPptBackground ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{t('songs.uploading')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground text-center">
                          <Presentation className="h-8 w-8" />
                          <span className="text-sm">{t('songs.dropPptBackground')}</span>
                          <span className="text-xs">{t('songs.dropPptBackgroundHint')}</span>
                        </div>
                      )}
                    </label>
                    {coverImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={useCoverAsPptBackground}
                      >
                        {t('songs.useCoverAsPptBackground')}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <SheetMusicPagesEditor
                pages={sheetMusicPages}
                uploading={uploadingSheet}
                onChange={setSheetMusicPages}
                onUploadFiles={uploadSheetFiles}
              />

              {/* 音频上传 */}
              <div className="space-y-2">
                <Label htmlFor="audioFile">{t('songs.audioFile')}</Label>
                {audioFile ? (
                  <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-900 truncate max-w-[200px]">
                          {audioFile.name}
                        </p>
                        {audioFile.size > 0 && (
                          <p className="text-xs text-purple-600">
                            {formatFileSize(audioFile.size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAudioFile}
                      className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-purple-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="audioFile"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      disabled={uploadingAudio}
                    />
                    <label
                      htmlFor="audioFile"
                      className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {uploadingAudio ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{t('songs.uploading')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                          <Music className="h-8 w-8" />
                          <span className="text-sm">{t('songs.clickUploadAudio')}</span>
                          <span className="text-xs">{t('songs.dropAudioHint')}</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* songs.songInfo */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t('songs.titleRequired')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder={t('songs.titlePlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">{t('songs.artistLabel')}</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData({ ...formData, artist: e.target.value })
                  }
                  placeholder={t('songs.artistPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="key">{t('songs.key')}</Label>
                <Input
                  id="key"
                  list="key-presets"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  placeholder={t('songs.keyPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
                <datalist id="key-presets">
                  {KEY_PRESETS.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeSignature">{t('songs.timeSignature')}</Label>
                <Input
                  id="timeSignature"
                  list="time-signature-presets"
                  value={formData.timeSignature}
                  onChange={(e) =>
                    setFormData({ ...formData, timeSignature: e.target.value })
                  }
                  placeholder={t('songs.timeSignaturePlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
                <datalist id="time-signature-presets">
                  {TIME_SIGNATURE_PRESETS.map((ts) => (
                    <option key={ts} value={ts} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="composer">{t('songs.composer')}</Label>
                <Input
                  id="composer"
                  value={formData.composer}
                  onChange={(e) =>
                    setFormData({ ...formData, composer: e.target.value })
                  }
                  placeholder={t('songs.composerPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lyricist">{t('songs.lyricist')}</Label>
                <Input
                  id="lyricist"
                  value={formData.lyricist}
                  onChange={(e) =>
                    setFormData({ ...formData, lyricist: e.target.value })
                  }
                  placeholder={t('songs.lyricistPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team">{t('songs.team')}</Label>
                <Input
                  id="team"
                  value={formData.team}
                  onChange={(e) =>
                    setFormData({ ...formData, team: e.target.value })
                  }
                  placeholder={t('songs.teamPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="album">{t('songs.album')}</Label>
                <Input
                  id="album"
                  value={formData.album}
                  onChange={(e) =>
                    setFormData({ ...formData, album: e.target.value })
                  }
                  placeholder={t('songs.albumPlaceholder')}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mvUrl">{t('songs.mvUrl')}</Label>
              <Input
                id="mvUrl"
                type="url"
                value={formData.mvUrl}
                onChange={(e) =>
                  setFormData({ ...formData, mvUrl: e.target.value })
                }
                placeholder={t('songs.mvUrlPlaceholder')}
                className="h-11 rounded-xl input-focus"
              />
            </div>

            <div className="space-y-4 md:col-span-2">
              <TagMultiSelect
                label={t('songs.typeTags')}
                tags={typeTags}
                selectedIds={tagIds.filter((id) => typeTags.some((tag) => tag.id === id))}
                onChange={(ids) => {
                  const styles = tagIds.filter((id) => styleTags.some((tag) => tag.id === id))
                  setTagIds([...ids, ...styles])
                }}
              />
              <TagMultiSelect
                label={t('songs.styleTags')}
                tags={styleTags}
                selectedIds={tagIds.filter((id) => styleTags.some((tag) => tag.id === id))}
                onChange={(ids) => {
                  const types = tagIds.filter((id) => typeTags.some((tag) => tag.id === id))
                  setTagIds([...types, ...ids])
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="lyrics">{t('songs.lyrics')}</Label>
                {sheetMusicPages[0]?.path && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={extractingLyrics}
                    onClick={() => void handleExtractLyrics()}
                  >
                    {extractingLyrics ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        {t('songs.extractingLyrics')}
                      </>
                    ) : (
                      t('songs.extractFromSheet')
                    )}
                  </Button>
                )}
              </div>
              <Textarea
                id="lyrics"
                value={formData.lyrics}
                onChange={(e) =>
                  setFormData({ ...formData, lyrics: e.target.value })
                }
                placeholder={t('songs.lyricsPlaceholderEdit')}
                rows={8}
                className="rounded-xl input-focus"
              />
              {formData.lyrics && (
                <p className="text-xs text-muted-foreground">
                  {t('songs.lyricsLines', { count: formData.lyrics.split('\n').length })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lyricsLrc">{t('songs.lyricsLrc')}</Label>
              <Textarea
                id="lyricsLrc"
                value={formData.lyricsLrc}
                onChange={(e) =>
                  setFormData({ ...formData, lyricsLrc: e.target.value })
                }
                placeholder={t('songs.lyricsLrcPlaceholder')}
                rows={6}
                className="rounded-xl input-focus font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('songs.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder={t('songs.notesPlaceholder')}
                rows={3}
                className="rounded-xl input-focus"
              />
            </div>

            <SongScripturesEditor
              value={scriptures}
              onChange={setScriptures}
              t={t}
            />

            <div className="flex justify-end space-x-4">
              <Link href={`/songs/${song.id}`}>
                <Button variant="outline" type="button" className="rounded-xl">
                  {t('common.cancel')}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving || uploadingSheet || uploadingAudio}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 btn-active"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('songs.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('songs.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
