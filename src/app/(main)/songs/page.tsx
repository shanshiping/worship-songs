'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Music, Plus, Search, FileText, LayoutGrid, List, Play, Calendar, ChevronRight, ListMusic, Tags,
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
        limit: '20',
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
              className="rounded-xl"
              onClick={() => setTagManagerOpen(true)}
            >
              <Tags className="mr-2 h-4 w-4" />
              {t('songs.manageTags')}
            </Button>
          )}
          {permissions.canCreateSong && (
            <Link
              href="/song-upload"
              className={buttonVariants({ className: 'rounded-xl btn-active' })}
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
              className="pl-10 h-11 rounded-xl input-focus"
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
              className="pl-10 h-11 rounded-xl input-focus"
            />
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('songs.cardView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-primary'
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-6 w-32 skeleton rounded mb-3" />
                  <div className="h-4 w-24 skeleton rounded mb-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        )
      ) : songs.length === 0 ? (
        <Card className="animate-fade-in border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Music className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">{t('songs.noSongs')}</p>
            <p className="text-muted-foreground mb-6">{t('songs.noSongsHint')}</p>
            {permissions.canCreateSong && (
              <Link
                href="/song-upload"
                className={buttonVariants({ className: 'rounded-xl' })}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('songs.uploadSong')}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {songs.map((song, index) => (
            <Card
              key={song.id}
              className="card-hover animate-fade-in border-0 shadow-sm h-full cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => router.push(`/songs/${song.id}`)}
            >
              <CardContent className="p-6">
                <div className="block group mb-3">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {song.title}
                      </h3>
                      {song.artist && (
                        <p className="text-sm text-muted-foreground mt-1">{song.artist}</p>
                      )}
                      {song.scriptures?.[0]?.reference && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {song.scriptures[0].reference}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Music className="h-6 w-6 text-foreground" />
                    </div>
                  </div>

                  {song.lyrics && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {song.lyrics.split('\n')[0]}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div
                  className="flex flex-wrap gap-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <SongTagBadges
                    tags={song.tags}
                    onTagClick={handleSongTagClick}
                    onUncategorizedClick={handleUncategorizedClick}
                  />
                </div>
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground shrink-0">
                    {song.sheetMusic && <FileText className="h-3 w-3" />}
                    {song.audioFile && <Play className="h-3 w-3" />}
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {song._count.meetings}
                    </div>
                  </div>
                </div>
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full justify-center rounded-lg"
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="mr-2 h-4 w-4" />
                    {t('playlists.addToPlaylist')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">{t('songs.songTitle')}</div>
            <div className="col-span-3">{t('songs.tags')}</div>
            <div className="col-span-2">{t('songs.artist')}</div>
            <div className="col-span-1">{t('songs.usageCount')}</div>
            <div className="col-span-2">{t('songs.attachments')}</div>
          </div>

          {songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center md:grid md:grid-cols-12 gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all animate-fade-in border border-gray-100 cursor-pointer"
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => router.push(`/songs/${song.id}`)}
            >
              <div className="min-w-0 md:col-span-4 flex items-center space-x-3 group">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Music className="h-5 w-5 text-foreground" />
                </div>
                <p className="font-medium group-hover:text-primary transition-colors truncate">
                  {song.title}
                </p>
              </div>

              <div
                className="md:col-span-3 hidden md:flex flex-wrap gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <SongTagBadges
                  tags={song.tags}
                  onTagClick={handleSongTagClick}
                  onUncategorizedClick={handleUncategorizedClick}
                />
              </div>

              <div className="md:col-span-2 hidden md:block">
                <p className="text-sm text-muted-foreground truncate">
                  {song.artist || '-'}
                </p>
              </div>

              <div className="md:col-span-1 hidden md:block">
                <span className="text-sm">{song._count.meetings}</span>
              </div>

              <div className="md:col-span-2 hidden md:flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center space-x-2">
                  {song.sheetMusic && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {t('songs.sheet')}
                    </Badge>
                  )}
                  {song.audioFile && (
                    <Badge variant="outline" className="text-xs">
                      <Play className="h-3 w-3 mr-1" />
                      {t('songs.audio')}
                    </Badge>
                  )}
                </div>
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg shrink-0"
                    title={t('playlists.addToPlaylist')}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="md:hidden flex items-center space-x-2 ml-auto">
                <SongTagBadges
                  tags={song.tags?.slice(0, 1)}
                  onTagClick={handleSongTagClick}
                  onUncategorizedClick={handleUncategorizedClick}
                />
                {canAddToPlaylist && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg shrink-0"
                    title={t('playlists.addToPlaylist')}
                    onClick={(event) => {
                      event.stopPropagation()
                      openAddToPlaylist(song.id)
                    }}
                  >
                    <ListMusic className="h-4 w-4" />
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground md:hidden" aria-hidden />
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
