'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Maximize2,
  Printer,
  Search,
  X,
} from 'lucide-react'
import { MergedSheetPreviewDialog } from '@/components/merged-sheet-preview-dialog'
import { useI18n } from '@/components/providers/i18n-provider'
import { SongLetterIndex } from '@/components/song-letter-index'
import { SheetsAgentPanel } from '@/components/sheets-agent-panel'
import { SheetsSongPreviewDialog } from '@/components/sheets-song-preview-dialog'
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
import { printSheetMusic } from '@/lib/sheet-viewer'
import type { ScriptureRecommendation } from '@/lib/scripture-recommendations'
import type { SongIndexLetter } from '@/lib/song-title-index'

const MAX_SONGS = 20
const MIN_QUERY_LENGTH = 2

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
  const [generating, setGenerating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('worship-sheets.pdf')
  const [previewSelectionKey, setPreviewSelectionKey] = useState<string | null>(null)

  const selectionKey = selectedSongs.map((song) => song.id).join('|')

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
            audioFile?: string | null
          }>
        }
        setSongs(
          (data.songs ?? []).map((song) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            sheetMusic: song.sheetMusic ?? null,
            audioFile: song.audioFile ?? null,
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
    if (selectedSongs.length === 0) {
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
        selectedSongs.map((song) => song.id),
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
    selectedSongs,
    selectionKey,
    showSkippedToast,
    t,
  ])

  const addSong = useCallback(
    (song: SheetsSongItem) => {
      setSelectedSongs((current) => {
        if (current.some((item) => item.id === song.id)) return current
        if (current.length >= MAX_SONGS) {
          toast.error(t('sheets.maxSongs'))
          return current
        }
        return [
          ...current,
          {
            id: song.id,
            title: song.title,
            artist: song.artist,
            sheetMusic: song.sheetMusic ?? null,
            audioFile: song.audioFile ?? null,
          },
        ]
      })
    },
    [t],
  )

  const addAllSongs = useCallback(
    (items: SheetsSongItem[]) => {
      for (const song of items) addSong(song)
    },
    [addSong],
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

  const isSelected = (songId: string) => selectedSongs.some((item) => item.id === songId)

  const songRowProps = (song: SheetsSongItem, meta?: string) => ({
    song,
    selected: isSelected(song.id),
    playing: playingSongId === song.id,
    meta,
    onAdd: () => addSong(song),
    onPreview: () => openSongPreview(song.id),
    onPlay: song.audioFile?.trim() ? () => togglePlay(song) : undefined,
  })

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs((current) => current.filter((song) => song.id !== songId))
  }

  const moveSong = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= selectedSongs.length) return
    setSelectedSongs((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

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
    await ensureMergedPdf()
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
        <p className="text-xs text-muted-foreground">{t('sheets.legend')}</p>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
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

        <Card className="flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-6rem)] lg:self-start">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-base">
              {t('sheets.selectedCount', { count: selectedSongs.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            {selectedSongs.length > 0 ? (
              <div className="max-h-36 shrink-0 space-y-1 overflow-y-auto">
                {selectedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-1 rounded-md bg-muted/40 py-0.5 pr-0.5 pl-1"
                  >
                    <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <SheetsSongRow
                      {...songRowProps(song)}
                      showAdd={false}
                      className="min-w-0 flex-1 px-0 hover:bg-transparent"
                    />
                    <div className="flex shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => moveSong(index, -1)}
                        aria-label={t('sheets.moveUp')}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === selectedSongs.length - 1}
                        onClick={() => moveSong(index, 1)}
                        aria-label={t('sheets.moveDown')}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveSong(song.id)}
                        aria-label={t('sheets.remove')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="shrink-0 py-2 text-center text-sm text-muted-foreground">
                {t('sheets.emptySelection')}
              </p>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/30">
              {generating && !previewBlobUrl ? (
                <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('sheets.generating')}
                </div>
              ) : previewBlobUrl ? (
                <>
                  <div className="flex items-center justify-end border-b bg-background/80 p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Maximize2 className="mr-1.5 h-4 w-4" />
                      {t('sheets.fullscreen')}
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <embed
                      src={`${previewBlobUrl}#view=FitH`}
                      type="application/pdf"
                      title={t('sheets.previewTitle')}
                      className="h-full min-h-[min(62vh,100%)] w-full border-0"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center text-sm text-muted-foreground">
                  <Eye className="mb-3 h-10 w-10 opacity-40" />
                  <p>{t('sheets.previewHint')}</p>
                </div>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={generating || selectedSongs.length === 0 || !permissions.canDownloadSong}
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
                disabled={generating || selectedSongs.length === 0 || !permissions.canDownloadSong}
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
                disabled={generating || selectedSongs.length === 0 || !permissions.canDownloadSong}
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
