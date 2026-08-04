'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
import { CreatePlaylistDialog } from '@/components/create-playlist-dialog'
import { isAdminOrAbove } from '@/lib/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { Check, ListMusic, Loader2, Plus } from 'lucide-react'

interface PlaylistOption {
  id: string
  title: string
  createdById: string
  _count?: { songs: number }
}

interface AddToPlaylistDialogProps {
  songId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddToPlaylistDialog({
  songId,
  open,
  onOpenChange,
}: AddToPlaylistDialogProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session } = useSession()
  const { canCreatePlaylist } = usePermissions()
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const userId = session?.user?.id
  const role = session?.user?.role

  const fetchPlaylists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/playlists?limit=100')
      if (res.ok) {
        const data = (await res.json()) as { playlists?: PlaylistOption[] }
        setPlaylists(data.playlists || [])
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setAddedId(null)
    void fetchPlaylists()
  }, [open, fetchPlaylists])

  const editablePlaylists = playlists.filter(
    (playlist) =>
      playlist.createdById === userId ||
      (role ? isAdminOrAbove(role) : false)
  )

  const appendSong = async (playlistId: string) => {
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null
      toast.error(data?.error || t('playlists.addFailed'))
      return false
    }

    return true
  }

  const handleSelect = async (playlistId: string) => {
    setAddingId(playlistId)
    try {
      const ok = await appendSong(playlistId)
      if (ok) {
        toast.success(t('playlists.addSuccess'))
        setAddedId(playlistId)
        onOpenChange(false)
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleCreated = async (playlist: { id: string }) => {
    setAddingId(playlist.id)
    try {
      const ok = await appendSong(playlist.id)
      if (ok) {
        toast.success(t('playlists.addSuccess'))
        onOpenChange(false)
        router.push(`/playlists/${playlist.id}`)
      }
    } finally {
      setAddingId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('playlists.addToPlaylist')}</DialogTitle>
            <DialogDescription>{t('playlists.pickPlaylist')}</DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : editablePlaylists.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ListMusic className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('playlists.noPlaylistsYet')}
                </p>
              </div>
            ) : (
              editablePlaylists.map((playlist) => {
                const isAdding = addingId === playlist.id
                const isAdded = addedId === playlist.id
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleSelect(playlist.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{playlist.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('playlists.songCount', {
                          count: playlist._count?.songs ?? 0,
                        })}
                      </p>
                    </div>
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : isAdded ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>

          <DialogFooter
            className={canCreatePlaylist ? 'sm:justify-between' : undefined}
          >
            {canCreatePlaylist ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('playlists.createAndAdd')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canCreatePlaylist ? (
        <CreatePlaylistDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  )
}
