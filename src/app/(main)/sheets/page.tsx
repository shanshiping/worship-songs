'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  BarChart3,
  Download,
  Eye,
  FileText,
  Loader2,
  Printer,
  Search,
  Share2,
  ClipboardCopy,
} from 'lucide-react'
import { MergedSheetPreviewDialog } from '@/components/merged-sheet-preview-dialog'
import { useI18n } from '@/components/providers/i18n-provider'
import { SongLetterIndex } from '@/components/song-letter-index'
import { SheetsAgentPanel } from '@/components/sheets-agent-panel'
import { SheetsSongPreviewDialog } from '@/components/sheets-song-preview-dialog'
import { SheetsSelectedSection } from '@/components/sheets-selected-section'
import { SheetsSongRow, type SheetsSongItem } from '@/components/sheets-song-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/hooks/use-permissions'
import type { ThemeMeetingMatch } from '@/lib/meeting-theme-search'
import {
  fetchMergedSheetPdf,
} from '@/lib/sheet-pdf-download-client'
import { buildSheetsShareText } from '@/lib/sheets-share-text'
import { printSheetMusic } from '@/lib/sheet-viewer'
import type { ScriptureRecommendation } from '@/lib/scripture-recommendations'
import type { SongIndexLetter } from '@/lib/song-title-index'

const MAX_SONGS = 20
const MIN_QUERY_LENGTH = 2

type AddTarget = 'main' | 'response' | 'communion'

const ADD_TARGETS: AddTarget[] = ['main', 'response', 'communion']

function scriptureQuery(raw: string): string {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? ''
}

export default function SheetsPage() {
  const { t } = useI18n()
  const permissions = usePermissions()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [theme, setTheme] = useState('')
  const [scripture, setScripture] = useState('')
  const [arrangement, setArrangement] = useState('')
  const [themeMeetings, setThemeMeetings] = useState<ThemeMeetingMatch[]>([])
  const [themeLoading, setThemeLoading] = useState(false)
  const [scriptureRec, setScriptureRec] = useState<ScriptureRecommendation | null>(null)
  const [scriptureLoading, setScriptureLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLetter, setSelectedLetter] = useState<SongIndexLetter | ''>('')
  const [indexLetters, setIndexLetters] = useState<Array<{ letter: SongIndexLetter; count: number }>>(
    [],
  )
  const [songs, setSongs] = useState<SheetsSongItem[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSongs, setSelectedSongs] = useState<SheetsSongItem[]>([])
  const [responseSongs, setResponseSongs] = useState<SheetsSongItem[]>([])
  const [communionSongs, setCommunionSongs] = useState<SheetsSongItem[]>([])
  const [addTarget, setAddTarget] = useState<AddTarget>('main')
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('worship-sheets.pdf')
  const [previewSelectionKey, setPreviewSelectionKey] = useState<string | null>(null)

  const allSelectedSongs = [...selectedSongs, ...responseSongs, ...communionSongs]
  const selectionKey = allSelectedSongs.map((song) => song.id).join('|')
  const totalSelectedCount = allSelectedSongs.length
  const hasCoreSelection = selectedSongs.length > 0 || responseSongs.length > 0

  const [previewSongId, setPreviewSongId] = useState<string | null>(null)
  const [previewSongOpen, setPreviewSongOpen] = useState(false)
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [playingSrc, setPlayingSrc] = useState<string | null>(null)

  const fetchIndexLetters = useCallback(async () => {
    try {
      const response = await fetch('/api/songs/letters')
      if (response.ok) {
        const data = (await response.json()) as {
          letters?: Array<{ letter: SongIndexLetter; count: number }>
        }
        setIndexLetters(data.letters ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch song index letters:', error)
    }
  }, [])

  const fetchSongs = useCallback(async (search: string, letter: SongIndexLetter | '') => {
    setSearching(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search.trim()) params.set('search', search.trim())
      if (letter) params.set('letter', letter)
      const response = await fetch(`/api/songs?${params}`)
      if (response.ok) {
        const data = (await response.json()) as {
          songs?: Array<{
            id: string
            title: string
            artist: string | null
            sheetMusic?: string | null
            sheetLinkUrl?: string | null
            audioFile?: string | null
            listenUrl?: string | null
          }>
        }
        setSongs(
          (data.songs ?? []).map((song) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            sheetMusic: song.sheetMusic ?? null,
            sheetLinkUrl: song.sheetLinkUrl ?? null,
            audioFile: song.audioFile ?? null,
            listenUrl: song.listenUrl ?? null,
          })),
        )
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    void fetchIndexLetters()
  }, [fetchIndexLetters])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSongs(searchQuery, selectedLetter)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedLetter, fetchSongs])

  useEffect(() => {
    const trimmed = theme.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setThemeMeetings([])
      return
    }

    const timer = setTimeout(async () => {
      setThemeLoading(true)
      try {
        const params = new URLSearchParams({ themeSearch: trimmed, limit: '5' })
        const response = await fetch(`/api/meetings?${params}`)
        if (response.ok) {
          const data = (await response.json()) as { meetings?: ThemeMeetingMatch[] }
          setThemeMeetings(data.meetings ?? [])
        }
      } catch (error) {
        console.error('Failed to fetch theme meetings:', error)
      } finally {
        setThemeLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [theme])

  useEffect(() => {
    const query = scriptureQuery(scripture)
    if (query.length < MIN_QUERY_LENGTH) {
      setScriptureRec(null)
      return
    }

    const timer = setTimeout(async () => {
      setScriptureLoading(true)
      try {
        const params = new URLSearchParams({ reference: query })
        const response = await fetch(`/api/songs/scripture-recommendations?${params}`)
        if (response.ok) {
          setScriptureRec((await response.json()) as ScriptureRecommendation)
        }
      } catch (error) {
        console.error('Failed to fetch scripture recommendations:', error)
      } finally {
        setScriptureLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [scripture])

  useEffect(() => {
    if (!playingSrc || !audioRef.current) return
    void audioRef.current.play().catch(() => {
      setPlayingSongId(null)
      setPlayingSrc(null)
    })
  }, [playingSrc])

  const showSkippedToast = useCallback(
    (skipped: string[]) => {
      if (skipped.length > 0) {
        toast.warning(t('sheets.skippedWarning', { titles: skipped.join('、') }))
      }
    },
    [t],
  )

  useEffect(() => {
    if (!previewBlobUrl) return
    URL.revokeObjectURL(previewBlobUrl)
    setPreviewBlobUrl(null)
    setPreviewSelectionKey(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- invalidate preview when song set/order changes
  }, [selectionKey])

  const ensureMergedPdf = useCallback(async () => {
    if (allSelectedSongs.length === 0) {
      toast.error(t('sheets.noSelection'))
      return null
    }
    if (!permissions.canDownloadSong) {
      toast.error(t('sheets.noPermission'))
      return null
    }

    if (previewBlobUrl && previewSelectionKey === selectionKey) {
      return { blobUrl: previewBlobUrl, filename: previewFilename, skipped: [] as string[] }
    }

    setGenerating(true)
    try {
      const { blob, filename, skipped } = await fetchMergedSheetPdf(
        allSelectedSongs.map((song) => song.id),
      )
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      const blobUrl = URL.createObjectURL(blob)
      setPreviewBlobUrl(blobUrl)
      setPreviewFilename(filename)
      setPreviewSelectionKey(selectionKey)
      showSkippedToast(skipped)
      return { blobUrl, filename, skipped }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('sheets.generateFailed'))
      return null
    } finally {
      setGenerating(false)
    }
  }, [
    permissions.canDownloadSong,
    previewBlobUrl,
    previewFilename,
    previewSelectionKey,
    allSelectedSongs,
    selectionKey,
    showSkippedToast,
    t,
  ])

  const isSongSelected = useCallback(
    (songId: string) =>
      selectedSongs.some((item) => item.id === songId) ||
      responseSongs.some((item) => item.id === songId) ||
      communionSongs.some((item) => item.id === songId),
    [selectedSongs, responseSongs, communionSongs],
  )

  const setterForTarget = useCallback((target: AddTarget) => {
    if (target === 'response') return setResponseSongs
    if (target === 'communion') return setCommunionSongs
    return setSelectedSongs
  }, [])

  const addSongToTarget = useCallback(
    (song: SheetsSongItem, target: AddTarget = addTarget) => {
      if (isSongSelected(song.id)) return

      const currentTotal =
        selectedSongs.length + responseSongs.length + communionSongs.length
      if (currentTotal >= MAX_SONGS) {
        toast.error(t('sheets.maxSongs'))
        return
      }

      const item: SheetsSongItem = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        sheetMusic: song.sheetMusic ?? null,
        sheetLinkUrl: song.sheetLinkUrl ?? null,
        audioFile: song.audioFile ?? null,
        listenUrl: song.listenUrl ?? null,
      }

      setterForTarget(target)((current) => [...current, item])
    },
    [
      addTarget,
      communionSongs.length,
      isSongSelected,
      responseSongs.length,
      selectedSongs.length,
      setterForTarget,
      t,
    ],
  )

  const addSong = useCallback(
    (song: SheetsSongItem) => addSongToTarget(song, addTarget),
    [addSongToTarget, addTarget],
  )

  const addAllSongs = useCallback(
    (items: SheetsSongItem[]) => {
      for (const song of items) addSong(song)
    },
    [addSong],
  )

  const removeSongFromTarget = useCallback((target: AddTarget, songId: string) => {
    setterForTarget(target)((current) => current.filter((song) => song.id !== songId))
  }, [setterForTarget])

  const moveSongInTarget = useCallback(
    (target: AddTarget, index: number, direction: -1 | 1) => {
      setterForTarget(target)((current) => {
        const nextIndex = index + direction
        if (nextIndex < 0 || nextIndex >= current.length) return current
        const next = [...current]
        ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
        return next
      })
    },
    [setterForTarget],
  )

  const openSongPreview = (songId: string) => {
    setPreviewSongId(songId)
    setPreviewSongOpen(true)
  }

  const togglePlay = (song: SheetsSongItem) => {
    if (!song.audioFile?.trim()) return

    if (playingSongId === song.id) {
      audioRef.current?.pause()
      setPlayingSongId(null)
      setPlayingSrc(null)
      return
    }

    setPlayingSongId(song.id)
    setPlayingSrc(song.audioFile)
  }

  const isSelected = (songId: string) => isSongSelected(songId)

  const songRowProps = (song: SheetsSongItem, meta?: string) => ({
    song,
    selected: isSelected(song.id),
    playing: playingSongId === song.id,
    meta,
    onAdd: () => addSong(song),
    onPreview: () => openSongPreview(song.id),
    onPlay: song.audioFile?.trim() ? () => togglePlay(song) : undefined,
  })

  const handleDownload = async () => {
    const cached = await ensureMergedPdf()
    if (!cached) return

    const anchor = document.createElement('a')
    anchor.href = cached.blobUrl
    anchor.download = cached.filename
    anchor.click()
    toast.success(t('sheets.downloadSuccess'))
  }

  const handlePreview = async () => {
    const cached = await ensureMergedPdf()
    if (cached) setPreviewOpen(true)
  }

  const handlePrint = async () => {
    const cached = await ensureMergedPdf()
    if (!cached) return

    try {
      printSheetMusic({
        path: cached.blobUrl,
        origin: window.location.origin,
        title: t('sheets.previewTitle'),
      })
    } catch (error) {
      console.error('Print merged sheet PDF failed:', error)
      toast.error(t('sheets.printFailed'))
    }
  }

  const handleShare = async () => {
    if (!hasCoreSelection) {
      toast.error(t('sheets.noSelection'))
      return
    }

    setSharing(true)
    try {
      const response = await fetch('/api/songs/sheets/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.trim() || undefined,
          scripture: scripture.trim() || undefined,
          arrangement: arrangement.trim() || undefined,
          songIds: selectedSongs.map((song) => song.id),
          responseSongIds: responseSongs.map((song) => song.id),
          communionSongIds: communionSongs.map((song) => song.id),
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(data?.error || t('share.createFailed'))
        return
      }

      const data = (await response.json()) as { url?: string }
      if (!data.url) {
        toast.error(t('share.createFailed'))
        return
      }

      await navigator.clipboard.writeText(data.url)
      toast.success(t('sheets.shareSuccess'))
    } catch (error) {
      console.error('Sheets share failed:', error)
      toast.error(t('share.failed'))
    } finally {
      setSharing(false)
    }
  }

  const shareTextLabels = {
    title: t('sheets.shareTextTitle'),
    theme: t('share.theme'),
    scripture: t('share.scripture'),
    arrangement: t('share.arrangement'),
    mainSongList: t('sheets.shareTextMainSongList'),
    responseSongList: t('sheets.shareTextResponseSongList'),
    communionSongList: t('sheets.shareTextCommunionSongList'),
    listen: t('sheets.shareTextListen'),
    noListen: t('sheets.shareTextNoListen'),
    sheet: t('sheets.shareTextSheet'),
    noSheet: t('sheets.shareTextNoSheet'),
    webLink: t('sheets.shareTextWebLink'),
  }

  const mapSongsForShareText = (items: SheetsSongItem[]) =>
    items.map((song) => ({
      title: song.title,
      artist: song.artist,
      listenUrl: song.listenUrl,
      sheetLinkUrl: song.sheetLinkUrl,
    }))

  const buildShareText = (shareUrl?: string) =>
    buildSheetsShareText({
      theme: theme.trim() || undefined,
      scripture: scripture.trim() || undefined,
      arrangement: arrangement.trim() || undefined,
      mainSongs: mapSongsForShareText(selectedSongs),
      responseSongs: mapSongsForShareText(responseSongs),
      communionSongs: mapSongsForShareText(communionSongs),
      shareUrl,
      labels: shareTextLabels,
    })

  const handleShareText = async () => {
    if (!hasCoreSelection) {
      toast.error(t('sheets.noSelection'))
      return
    }

    try {
      await navigator.clipboard.writeText(buildShareText())
      toast.success(t('sheets.shareTextSuccess'))
    } catch (error) {
      console.error('Sheets text share failed:', error)
      toast.error(t('share.failed'))
    }
  }

  const closePreview = (open: boolean) => {
    setPreviewOpen(open)
  }

  const scriptureSearch = scriptureQuery(scripture)
  const showThemeRecommend = theme.trim().length >= MIN_QUERY_LENGTH
  const showScriptureRecommend = scriptureSearch.length >= MIN_QUERY_LENGTH
  const showRecommend = showThemeRecommend || showScriptureRecommend

  const scriptureSongs: SheetsSongItem[] = [
    ...(scriptureRec?.directMatches ?? []),
    ...(scriptureRec?.historicalPicks ?? []),
  ].filter((song, index, list) => list.findIndex((item) => item.id === song.id) === index)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
            <FileText className="h-4 w-4" />
            {t('sheets.eyebrow')}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('sheets.title')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/sheets/leaders">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              {t('sheets.leaderStatsLink')}
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">{t('sheets.legend')}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          placeholder={t('sheets.themePlaceholder')}
          aria-label={t('sheets.themeLabel')}
        />
        <Textarea
          value={scripture}
          onChange={(event) => setScripture(event.target.value)}
          placeholder={t('sheets.scripturePlaceholder')}
          aria-label={t('sheets.scriptureLabel')}
          rows={4}
          className="min-h-28 resize-y"
        />
      </div>

      {!permissions.canDownloadSong && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t('sheets.noPermissionHint')}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="space-y-5 pt-4">
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('sheets.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="mb-2">
                <SongLetterIndex
                  letters={indexLetters}
                  selected={selectedLetter}
                  onSelect={setSelectedLetter}
                />
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('sheets.addTargetLabel')}</span>
                {ADD_TARGETS.map((target) => (
                  <Button
                    key={target}
                    type="button"
                    variant={addTarget === target ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAddTarget(target)}
                  >
                    {t(`sheets.section${target.charAt(0).toUpperCase()}${target.slice(1)}`)}
                  </Button>
                ))}
              </div>
              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                {searching ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('sheets.searching')}
                  </p>
                ) : songs.length > 0 ? (
                  songs.map((song) => (
                    <SheetsSongRow key={song.id} {...songRowProps(song)} />
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('sheets.noResults')}
                  </p>
                )}
              </div>
            </div>

            {showRecommend && (
              <div className="space-y-4 border-t pt-4">
                {showThemeRecommend && (
                  <div className="space-y-2">
                    {themeLoading ? (
                      <p className="text-sm text-muted-foreground">{t('sheets.loading')}</p>
                    ) : themeMeetings.length > 0 ? (
                      themeMeetings.map((meeting) => (
                        <div key={meeting.id} className="rounded-lg border p-2">
                          <div className="mb-2 flex items-center justify-between gap-2 px-1">
                            <p className="truncate text-sm font-medium">{meeting.theme}</p>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {format(new Date(meeting.date), 'yyyy-MM-dd')}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {meeting.songs.map((song) => (
                              <SheetsSongRow
                                key={song.id}
                                {...songRowProps(song, meeting.leader ?? undefined)}
                              />
                            ))}
                          </div>
                          {meeting.songs.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => addAllSongs(meeting.songs)}
                            >
                              {t('sheets.addAll')}
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('sheets.themeEmpty')}</p>
                    )}
                  </div>
                )}

                {showScriptureRecommend && (
                  <div className="space-y-1">
                    {scriptureLoading ? (
                      <p className="text-sm text-muted-foreground">{t('sheets.loading')}</p>
                    ) : scriptureSongs.length > 0 ? (
                      scriptureSongs.map((song) => {
                        const direct = scriptureRec?.directMatches.find(
                          (item) => item.id === song.id,
                        )
                        const historical = scriptureRec?.historicalPicks.find(
                          (item) => item.id === song.id,
                        )
                        const meta = historical
                          ? t('sheets.usedCount', { count: historical.count })
                          : direct?.reference
                        return <SheetsSongRow key={song.id} {...songRowProps(song, meta)} />
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('sheets.scriptureEmpty')}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('sheets.agentTitle')}
              </p>
              <SheetsAgentPanel theme={theme} scripture={scripture} onAddSong={addSong} embedded />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t('sheets.selectedCount', { count: totalSelectedCount })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SheetsSelectedSection
              title={t('sheets.mainSongListTitle')}
              songs={selectedSongs}
              emptyText={t('sheets.mainEmpty')}
              onMove={(index, direction) => moveSongInTarget('main', index, direction)}
              onRemove={(songId) => removeSongFromTarget('main', songId)}
              songRowProps={songRowProps}
            />
            <SheetsSelectedSection
              title={t('sheets.responseSongListTitle')}
              songs={responseSongs}
              emptyText={t('sheets.responseEmpty')}
              onMove={(index, direction) => moveSongInTarget('response', index, direction)}
              onRemove={(songId) => removeSongFromTarget('response', songId)}
              songRowProps={songRowProps}
            />
            <SheetsSelectedSection
              title={t('sheets.communionSongListTitle')}
              optional
              songs={communionSongs}
              emptyText={t('sheets.communionEmpty')}
              onMove={(index, direction) => moveSongInTarget('communion', index, direction)}
              onRemove={(songId) => removeSongFromTarget('communion', songId)}
              songRowProps={songRowProps}
            />

            {hasCoreSelection && (
              <div className="space-y-1.5">
                <label
                  htmlFor="sheets-arrangement"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t('sheets.arrangementLabel')}
                </label>
                <Textarea
                  id="sheets-arrangement"
                  value={arrangement}
                  onChange={(event) => setArrangement(event.target.value)}
                  placeholder={t('sheets.arrangementPlaceholder')}
                  rows={3}
                  className="min-h-20 resize-y text-sm"
                />
              </div>
            )}

            {allSelectedSongs.length > 0 && (
              <p className="text-xs text-muted-foreground">{t('sheets.previewHint')}</p>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                disabled={generating || allSelectedSongs.length === 0 || !permissions.canDownloadSong}
                onClick={() => void handlePreview()}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="mr-1.5 h-4 w-4" />
                    {t('sheets.preview')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={generating || allSelectedSongs.length === 0 || !permissions.canDownloadSong}
                onClick={() => void handlePrint()}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Printer className="mr-1.5 h-4 w-4" />
                    {t('sheets.print')}
                  </>
                )}
              </Button>
              <Button
                disabled={generating || allSelectedSongs.length === 0 || !permissions.canDownloadSong}
                onClick={() => void handleDownload()}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    {t('sheets.download')}
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                disabled={sharing || !hasCoreSelection}
                onClick={() => void handleShare()}
              >
                {sharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Share2 className="mr-1.5 h-4 w-4" />
                    {t('sheets.share')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!hasCoreSelection}
                onClick={() => void handleShareText()}
              >
                <ClipboardCopy className="mr-1.5 h-4 w-4" />
                {t('sheets.shareText')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <audio
        ref={audioRef}
        src={playingSrc ?? undefined}
        className="hidden"
        preload="none"
        onEnded={() => {
          setPlayingSongId(null)
          setPlayingSrc(null)
        }}
      />

      <MergedSheetPreviewDialog
        open={previewOpen}
        onOpenChange={closePreview}
        blobUrl={previewBlobUrl}
        filename={previewFilename}
      />

      <SheetsSongPreviewDialog
        songId={previewSongId}
        open={previewSongOpen}
        onOpenChange={setPreviewSongOpen}
      />
    </div>
  )
}
