'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CreatePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (playlist: { id: string }) => void
}

interface CreatedPlaylist {
  id: string
}

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePlaylistDialogProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim()) {
      toast.error(t('playlists.titleRequired'))
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        toast.error(data?.error || t('playlists.createFailed'))
        return
      }

      const playlist = (await res.json()) as CreatedPlaylist
      resetForm()
      onOpenChange(false)

      if (onCreated) {
        onCreated({ id: playlist.id })
      } else {
        router.push(`/playlists/${playlist.id}`)
      }
    } catch {
      toast.error(t('playlists.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('playlists.createDialogTitle')}</DialogTitle>
            <DialogDescription>{t('playlists.info')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="playlist-title">{t('playlists.name')}</Label>
            <Input
              id="playlist-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-description">
              {t('playlists.description')}
            </Label>
            <Textarea
              id="playlist-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('playlists.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
