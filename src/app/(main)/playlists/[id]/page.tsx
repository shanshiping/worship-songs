'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Music,
  Pencil,
  Plus,
  Trash,
  X,
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'
import { SongTagBadges, type TagItem } from '@/components/tag-multi-select'
import { AddSongsToPlaylistDialog } from '@/components/add-songs-to-playlist-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface PlaylistDetail {
  id: string
  title: string
  description: string | null
  createdById: string
  createdBy?: { name: string | null }
  songs: Array<{
    order: number
    song: {
      id: string
      title: string
      artist: string | null
      key: string | null
      lyrics: string | null
      sheetMusic: string | null
      audioFile: string | null
      tags: Array<{ tag: TagItem }>
    }
  }>
}

export default function PlaylistDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const permissions = usePermissions()
  const { data: session } = useSession()
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [addSongsOpen, setAddSongsOpen] = useState(false)
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const id = typeof params.id === 'string' ? params.id : ''

  const fetchPlaylist = useCallback(() => {
    if (!id) return
    fetch(`/api/playlists/${id}`)
      .then(async (res) => {
        if (res.ok) setPlaylist(await res.json())
        else router.push('/playlists')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    fetchPlaylist()
  }, [fetchPlaylist])

  const canEdit =
    permissions.canEditPlaylist &&
    playlist &&
    (playlist.createdById === session?.user?.id || permissions.isAdminOrAbove)

  const canDelete =
    permissions.canDeletePlaylist &&
    playlist &&
    (playlist.createdById === session?.user?.id || permissions.isAdminOrAbove)

  const handleDelete = async () => {
    if (!confirm(t('playlists.confirmDelete'))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('playlists.deleted'))
        router.push('/playlists')
      } else {
        const data = await res.json()
        toast.error(data.error || t('playlists.deleteFailed'))
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleRemove = async (songId: string) => {
    setActionId(songId)
    try {
      const res = await fetch(`/api/playlists/${id}/songs/${songId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPlaylist(await res.json())
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        toast.error(data?.error || t('playlists.removeFailed'))
      }
    } finally {
      setActionId(null)
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!playlist) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= playlist.songs.length) return

    const orderedIds = playlist.songs.map((item) => item.song.id)
    const tmp = orderedIds[index]
    orderedIds[index] = orderedIds[nextIndex]
    orderedIds[nextIndex] = tmp

    setActionId(playlist.songs[index].song.id)
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: playlist.title,
          description: playlist.description,
          songIds: orderedIds,
        }),
      })
      if (res.ok) {
        setPlaylist(await res.json())
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        toast.error(data?.error || t('playlists.updateFailed'))
      }
    } finally {
      setActionId(null)
    }
  }

  const openEditInfo = () => {
    if (!playlist) return
    setEditTitle(playlist.title)
    setEditDescription(playlist.description || '')
    setEditInfoOpen(true)
  }

  const handleSaveInfo = async () => {
    if (!playlist) return
    if (!editTitle.trim()) {
      toast.error(t('playlists.titleRequired'))
      return
    }
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          songIds: playlist.songs.map((item) => item.song.id),
        }),
      })
      if (res.ok) {
        setPlaylist(await res.json())
        toast.success(t('playlists.updateSuccess'))
        setEditInfoOpen(false)
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        toast.error(data?.error || t('playlists.updateFailed'))
      }
    } finally {
      setSavingInfo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!playlist) return null

  const existingSongIds = playlist.songs.map((item) => item.song.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/playlists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-muted-foreground mt-1">{playlist.description}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <ShareButton type="playlist" id={playlist.id} />
          {canEdit && (
            <Button variant="outline" onClick={openEditInfo}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('playlists.editInfo')}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            {t('playlists.songs')} ({playlist.songs.length})
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setAddSongsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('playlists.addSongs')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {playlist.songs.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-4">
              <p className="text-muted-foreground">{t('playlists.noneSelected')}</p>
              {canEdit && (
                <Button onClick={() => setAddSongsOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('playlists.addSongs')}
                </Button>
              )}
            </div>
          ) : (
            playlist.songs.map((item, index) => {
              const rowBusy = actionId === item.song.id
              return (
                <div key={item.song.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">{item.order}</span>
                      <Music className="h-4 w-4" />
                      <div>
                        <Link
                          href={`/songs/${item.song.id}`}
                          className="font-semibold hover:text-primary"
                        >
                          {item.song.title}
                        </Link>
                        {item.song.artist && (
                          <p className="text-sm text-muted-foreground">{item.song.artist}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        <SongTagBadges tags={item.song.tags} />
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0 || rowBusy}
                            onClick={() => handleMove(index, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === playlist.songs.length - 1 || rowBusy}
                            onClick={() => handleMove(index, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={rowBusy}
                            onClick={() => handleRemove(item.song.id)}
                          >
                            {rowBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.song.key && (
                    <p className="text-sm text-muted-foreground pl-9">
                      {t('songs.key')}: {item.song.key}
                    </p>
                  )}
                  {item.song.lyrics && (
                    <pre className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3 pl-9 max-h-40 overflow-y-auto">
                      {item.song.lyrics}
                    </pre>
                  )}
                  <div className="flex gap-3 pl-9 text-sm">
                    {item.song.sheetMusic && (
                      <a href={item.song.sheetMusic} target="_blank" rel="noreferrer" className="text-primary underline">
                        {t('songs.sheet')}
                      </a>
                    )}
                    {item.song.audioFile && (
                      <audio controls src={item.song.audioFile} className="h-8 max-w-xs" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <AddSongsToPlaylistDialog
        playlistId={id}
        open={addSongsOpen}
        onOpenChange={setAddSongsOpen}
        existingSongIds={existingSongIds}
        onChanged={fetchPlaylist}
      />

      <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.editInfo')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-playlist-title">{t('playlists.name')}</Label>
              <Input
                id="edit-playlist-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={savingInfo}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-playlist-description">{t('playlists.description')}</Label>
              <Textarea
                id="edit-playlist-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={savingInfo}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditInfoOpen(false)}
              disabled={savingInfo}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSaveInfo} disabled={savingInfo}>
              {savingInfo ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
