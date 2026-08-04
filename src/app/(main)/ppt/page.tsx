'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Presentation,
  Search,
  X,
} from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/hooks/use-permissions'
import { downloadLyricsPpt } from '@/lib/ppt-download-client'

interface SongResult {
  id: string
  title: string
  artist: string | null
}

export default function PptPage() {
  const { t } = useI18n()
  const permissions = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [songs, setSongs] = useState<SongResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSongs, setSelectedSongs] = useState<SongResult[]>([])
  const [generating, setGenerating] = useState(false)

  const fetchSongs = useCallback(async (search: string) => {
    setSearching(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search.trim()) params.set('search', search.trim())
      const response = await fetch(`/api/songs?${params}`)
      if (response.ok) {
        const data = (await response.json()) as { songs?: SongResult[] }
        setSongs(data.songs ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSongs(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchSongs])

  const handleAddSong = (song: SongResult) => {
    if (selectedSongs.some((item) => item.id === song.id)) return
    if (selectedSongs.length >= 20) {
      toast.error(t('ppt.maxSongs'))
      return
    }
    setSelectedSongs([...selectedSongs, song])
  }

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs(selectedSongs.filter((song) => song.id !== songId))
  }

  const moveSong = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= selectedSongs.length) return
    const next = [...selectedSongs]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSelectedSongs(next)
  }

  const handleGenerate = async () => {
    if (selectedSongs.length === 0) {
      toast.error(t('ppt.noSelection'))
      return
    }
    if (!permissions.canDownloadSong) {
      toast.error(t('ppt.noPermission'))
      return
    }

    setGenerating(true)
    try {
      const { skipped } = await downloadLyricsPpt(selectedSongs.map((song) => song.id))
      toast.success(t('ppt.generateSuccess'))
      if (skipped.length > 0) {
        toast.warning(t('ppt.skippedWarning', { titles: skipped.join('、') }))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ppt.generateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Presentation className="h-4 w-4" />
          {t('ppt.eyebrow')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('ppt.title')}</h1>
        <p className="max-w-2xl text-muted-foreground">{t('ppt.subtitle')}</p>
      </div>

      {!permissions.canDownloadSong && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t('ppt.noPermissionHint')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ppt.searchTitle')}</CardTitle>
            <CardDescription>{t('ppt.searchDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('ppt.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {searching ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('ppt.searching')}
                </p>
              ) : songs.length > 0 ? (
                songs.map((song) => {
                  const selected = selectedSongs.some((item) => item.id === song.id)
                  return (
                    <button
                      key={song.id}
                      type="button"
                      disabled={selected}
                      onClick={() => handleAddSong(song)}
                      className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-muted disabled:cursor-default disabled:opacity-50"
                    >
                      <div>
                        <p className="font-medium">{song.title}</p>
                        {song.artist && (
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )
                })
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('ppt.noResults')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ppt.selectedTitle')}</CardTitle>
            <CardDescription>
              {t('ppt.selectedCount', { count: selectedSongs.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSongs.length > 0 ? (
              <div className="space-y-2">
                {selectedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{song.title}</p>
                        {song.artist && (
                          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => moveSong(index, -1)}
                        aria-label={t('ppt.moveUp')}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === selectedSongs.length - 1}
                        onClick={() => moveSong(index, 1)}
                        aria-label={t('ppt.moveDown')}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveSong(song.id)}
                        aria-label={t('ppt.remove')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('ppt.emptySelection')}
              </p>
            )}

            <Button
              className="w-full"
              disabled={generating || selectedSongs.length === 0 || !permissions.canDownloadSong}
              onClick={() => void handleGenerate()}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('ppt.generating')}
                </>
              ) : (
                <>
                  <Presentation className="mr-2 h-4 w-4" />
                  {t('ppt.generate')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('ppt.formatTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t('ppt.format1')}</li>
            <li>• {t('ppt.format2')}</li>
            <li>• {t('ppt.format3')}</li>
            <li>• {t('ppt.format4')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
