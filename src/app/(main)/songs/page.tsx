'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Music, Plus, Search, FileText, LayoutGrid, List, Play, Calendar, ListMusic, Tags,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { TagMultiSelect, SongTagBadges, type TagItem } from '@/components/tag-multi-select'
import { AddToPlaylistDialog } from '@/components/add-to-playlist-dialog'
import { TagManagerDialog } from '@/components/tag-manager-dialog'

interface Song {
  id: string
  title: string
  artist: string | null
  sheetMusic: string | null
  audioFile: string | null
  lyrics: string | null
  tags: Array<{ tag: TagItem }>
  scriptures?: Array<{
    reference: string
    text?: string | null
    order?: number
  }>
  _count: {
    meetings: number
  }
  createdAt: string
}

type ViewMode = 'grid' | 'list'

const SONGS_PER_PAGE = 40

export default function SongsPage() {
  const { t } = useI18n()
  const router = useRouter()
  const permissions = usePermissions()
  const [songs, setSongs] = useState<Song[]>([])
  const [typeTags, setTypeTags] = useState<TagItem[]>([])
  const [styleTags, setStyleTags] = useState<TagItem[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lyricsSearch, setLyricsSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [totalSongs, setTotalSongs] = useState(0)
  const [addToPlaylistSongId, setAddToPlaylistSongId] = useState<string | null>(null)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)

  const canAddToPlaylist = permissions.canEditPlaylist || permissions.canCreatePlaylist

  const openAddToPlaylist = (songId: string) => {
    setAddToPlaylistSongId(songId)
  }

  const handleSongTagClick = (tag: TagItem) => {
    setPage(1)
    if (tag.kind === 'TYPE') {
      setSelectedTypeIds((prev) =>
        prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
      )
    } else if (tag.kind === 'STYLE') {
      setSelectedStyleIds((prev) =>
        prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
      )
    }
  }

  const handleUncategorizedClick = () => {
    setSelectedTypeIds([])
    setSelectedStyleIds([])
    setPage(1)
  }

  useEffect(() => {
    fetchTags()
    const savedViewMode = localStorage.getItem('songsViewMode') as ViewMode
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [search, lyricsSearch, selectedTypeIds, selectedStyleIds, page])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        const tags = (data.tags || []) as TagItem[]
        setTypeTags(tags.filter((tag) => tag.kind === 'TYPE'))
        setStyleTags(tags.filter((tag) => tag.kind === 'STYLE'))
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const fetchSongs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: SONGS_PER_PAGE.toString(),
      })

      if (search) params.append('search', search)
      if (lyricsSearch) params.append('lyricsSearch', lyricsSearch)
      for (const id of [...selectedTypeIds, ...selectedStyleIds]) {
        params.append('tagIds', id)
      }

      const response = await fetch(`/api/songs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
        setTotalPages(data.pagination.pages)
        setTotalSongs(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('songsViewMode', mode)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">{t('songs.title')}</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {permissions.isLeaderOrAbove ? t('songs.manageAll') : t('songs.browse')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('songs.totalCount', { count: totalSongs, categories: typeTags.length })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {(permissions.canCreateCategory ||
            permissions.canEditCategory ||
            permissions.canDeleteCategory) && (
            <Button
              variant="outline"
              onClick={() => setTagManagerOpen(true)}
            >
              <Tags className="mr-2 h-4 w-4" />
              {t('songs.manageTags')}
            </Button>
          )}
          {permissions.canCreateSong && (
            <Link
              href="/song-upload"
              className={buttonVariants({ className: 'btn-active' })}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('songs.uploadSong')}
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('songs.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10 h-10 input-focus"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('songs.searchLyricsPlaceholder')}
              value={lyricsSearch}
              onChange={(e) => {
                setLyricsSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10 h-10 input-focus"
            />
          </div>
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 rounded-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-background text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('songs.cardView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-background text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('songs.listView')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <TagMultiSelect
          label={t('songs.typeTags')}
          tags={typeTags}
          selectedIds={selectedTypeIds}
          onChange={(ids) => {
            setSelectedTypeIds(ids)
            setPage(1)
          }}
        />
        <TagMultiSelect
          label={t('songs.styleTags')}
          tags={styleTags}
          selectedIds={selectedStyleIds}
          onChange={(ids) => {
            setSelectedStyleIds(ids)
            setPage(1)
          }}
        />
      </div>

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse px-2 py-2">
                <div className="mb-1.5 h-4 w-28 skeleton rounded" />
                <div className="h-3 w-20 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-9 skeleton" />
            ))}
          </div>
        )
      ) : songs.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Music className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">{t('songs.noSongs')}</p>
            <p className="text-muted-foreground mb-6">{t('songs.noSongsHint')}</p>
            {permissions.canCreateSong && (
              <Link
                href="/song-upload"
                className={buttonVariants()}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('songs.uploadSong')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className="group animate-fade-in cursor-pointer rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/40"
              style={{ animationDelay: `${index * 20}ms` }}
              onClick={() => router.push(`/songs/${song.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">
                    {song.title}
                  </h3>
                  {(song.artist || song.scriptures?.[0]?.reference) && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {[song.artist, song.scriptures?.[0]?.reference].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-muted-foreground">
                  {song.sheetMusic && <FileText className="h-3 w-3" />}
                  {song.audioFile && <Play className="h-3 w-3" />}
                  <span className="flex items-center text-[11px]">
                    <Calendar className="mr-0.5 h-3 w-3" />
                    {song._count.meetings}
                  </span>
                </div>
              </div>

              <div
                className="mt-1.5 flex items-center justify-between gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                <SongTagBadges
                  tags={song.tags}
                  onTagClick={handleSongTagClick}
                  onUncategorizedClick={handleUncategorizedClick}
                />
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    title={t('playlists.addToPlaylist')}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border/60 text-sm">
          <div className="hidden px-2 py-1.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-3">
            <div className="col-span-4">{t('songs.songTitle')}</div>
            <div className="col-span-3">{t('songs.tags')}</div>
            <div className="col-span-2">{t('songs.artist')}</div>
            <div className="col-span-1">{t('songs.usageCount')}</div>
            <div className="col-span-2">{t('songs.attachments')}</div>
          </div>

          {songs.map((song, index) => (
            <div
              key={song.id}
              className="group flex animate-fade-in cursor-pointer items-center gap-3 px-2 py-1.5 transition-colors hover:bg-muted/40 md:grid md:grid-cols-12 md:gap-3"
              style={{ animationDelay: `${index * 15}ms` }}
              onClick={() => router.push(`/songs/${song.id}`)}
            >
              <div className="min-w-0 md:col-span-4">
                <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                  {song.title}
                </p>
              </div>

              <div
                className="hidden flex-wrap gap-1 md:col-span-3 md:flex"
                onClick={(event) => event.stopPropagation()}
              >
                <SongTagBadges
                  tags={song.tags}
                  onTagClick={handleSongTagClick}
                  onUncategorizedClick={handleUncategorizedClick}
                />
              </div>

              <div className="hidden md:col-span-2 md:block">
                <p className="truncate text-xs text-muted-foreground">
                  {song.artist || '-'}
                </p>
              </div>

              <div className="hidden md:col-span-1 md:block">
                <span className="text-xs text-muted-foreground">{song._count.meetings}</span>
              </div>

              <div className="hidden items-center justify-between gap-2 md:col-span-2 md:flex">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {song.sheetMusic && (
                    <span title={t('songs.sheet')}>
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {song.audioFile && (
                    <span title={t('songs.audio')}>
                      <Play className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    title={t('playlists.addToPlaylist')}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2 md:hidden">
                <SongTagBadges
                  tags={song.tags?.slice(0, 1)}
                  onTagClick={handleSongTagClick}
                  onUncategorizedClick={handleUncategorizedClick}
                />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {song.sheetMusic && <FileText className="h-3 w-3" />}
                  {song.audioFile && <Play className="h-3 w-3" />}
                </div>
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    title={t('playlists.addToPlaylist')}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 animate-fade-in">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="rounded-lg"
          >
            {t('songs.prevPage')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="rounded-lg"
          >
            {t('songs.nextPage')}
          </Button>
        </div>
      )}

      {addToPlaylistSongId && (
        <AddToPlaylistDialog
          songId={addToPlaylistSongId}
          open={!!addToPlaylistSongId}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setAddToPlaylistSongId(null)
          }}
        />
      )}

      <TagManagerDialog
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        onChanged={fetchTags}
      />
    </div>
  )
}
