'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Check, Loader2, Plus, Search } from 'lucide-react'
import { TagMultiSelect, type TagItem } from '@/components/tag-multi-select'

interface SongResult {
  id: string
  title: string
  artist: string | null
}

interface AddSongsToPlaylistDialogProps {
  playlistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSongIds: string[]
  onChanged: () => void
}

export function AddSongsToPlaylistDialog({
  playlistId,
  open,
  onOpenChange,
  existingSongIds,
  onChanged,
}: AddSongsToPlaylistDialogProps) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeTags, setTypeTags] = useState<TagItem[]>([])
  const [styleTags, setStyleTags] = useState<TagItem[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([])
  const [songs, setSongs] = useState<SongResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data: { tags?: TagItem[] }) => {
        const tags = data.tags || []
        setTypeTags(tags.filter((tag) => tag.kind === 'TYPE'))
        setStyleTags(tags.filter((tag) => tag.kind === 'STYLE'))
      })
      .catch(console.error)
  }, [open])

  const fetchSongs = useCallback(async () => {
    setSearching(true)
    try {
      const paramsQs = new URLSearchParams({ limit: '50' })
      if (searchQuery.trim()) paramsQs.set('search', searchQuery.trim())
      for (const tagId of [...selectedTypeIds, ...selectedStyleIds]) {
        paramsQs.append('tagIds', tagId)
      }
      const res = await fetch(`/api/songs?${paramsQs}`)
      if (res.ok) {
        const data = (await res.json()) as { songs?: SongResult[] }
        setSongs(data.songs || [])
      }
    } finally {
      setSearching(false)
    }
  }, [searchQuery, selectedTypeIds, selectedStyleIds])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      void fetchSongs()
    }, 300)
    return () => clearTimeout(timer)
  }, [open, fetchSongs])

  const handleAdd = async (songId: string) => {
    setAddingId(songId)
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      })
      if (res.ok) {
        toast.success(t('playlists.addSuccess'))
        onChanged()
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        toast.error(data?.error || t('playlists.addFailed'))
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery('')
      setSelectedTypeIds([])
      setSelectedStyleIds([])
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('playlists.addSongs')}</DialogTitle>
          <DialogDescription>{t('playlists.pickSongs')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('songs.searchPlaceholder')}
            />
          </div>
          <TagMultiSelect
            label={t('songs.typeTags')}
            tags={typeTags}
            selectedIds={selectedTypeIds}
            onChange={setSelectedTypeIds}
          />
          <TagMultiSelect
            label={t('songs.styleTags')}
            tags={styleTags}
            selectedIds={selectedStyleIds}
            onChange={setSelectedStyleIds}
          />
          <div className="max-h-72 overflow-y-auto space-y-1 border rounded-lg p-1">
            {searching ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('common.loading')}
              </p>
            ) : songs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('songs.noResults')}
              </p>
            ) : (
              songs.map((song) => {
                const alreadyAdded = existingSongIds.includes(song.id)
                const isAdding = addingId === song.id
                return (
                  <div
                    key={song.id}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      {song.artist && (
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artist}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant={alreadyAdded ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={alreadyAdded || isAdding}
                      onClick={() => handleAdd(song.id)}
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : alreadyAdded ? (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          {t('playlists.added')}
                        </>
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
