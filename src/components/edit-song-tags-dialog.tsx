'use client'

import { useEffect, useState } from 'react'
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
import { TagMultiSelect, type TagItem } from '@/components/tag-multi-select'
import { Loader2 } from 'lucide-react'

type EditSongTagsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  song: {
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
    audioFile: string | null
    lyrics: string | null
    notes: string | null
    tags: Array<{ tag: TagItem }>
  }
  onSaved: () => void
}

export function EditSongTagsDialog({
  open,
  onOpenChange,
  song,
  onSaved,
}: EditSongTagsDialogProps) {
  const { t } = useI18n()
  const [typeTags, setTypeTags] = useState<TagItem[]>([])
  const [styleTags, setStyleTags] = useState<TagItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setSelectedIds(song.tags.map((st) => st.tag.id))
    setLoading(true)

    fetch('/api/tags')
      .then((res) => res.json())
      .then((data: { tags?: TagItem[] }) => {
        const tags = data.tags || []
        setTypeTags(tags.filter((tag) => tag.kind === 'TYPE'))
        setStyleTags(tags.filter((tag) => tag.kind === 'STYLE'))
      })
      .catch((error) => {
        console.error('Failed to fetch tags:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, song.tags])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          artist: song.artist,
          key: song.key,
          timeSignature: song.timeSignature,
          composer: song.composer,
          lyricist: song.lyricist,
          team: song.team,
          album: song.album,
          mvUrl: song.mvUrl,
          sheetMusic: song.sheetMusic,
          audioFile: song.audioFile,
          lyrics: song.lyrics,
          notes: song.notes,
          tagIds: selectedIds,
        }),
      })

      if (response.ok) {
        toast.success(t('songs.tagsUpdateSuccess'))
        onSaved()
        onOpenChange(false)
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || t('songs.tagsUpdateFailed'))
      }
    } catch (error) {
      console.error('Failed to update tags:', error)
      toast.error(t('songs.tagsUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('songs.editTags')}</DialogTitle>
          <DialogDescription>{song.title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <TagMultiSelect
              label={t('songs.typeTags')}
              tags={typeTags}
              selectedIds={selectedIds.filter((id) =>
                typeTags.some((tag) => tag.id === id)
              )}
              onChange={(ids) => {
                const styles = selectedIds.filter((id) =>
                  styleTags.some((tag) => tag.id === id)
                )
                setSelectedIds([...ids, ...styles])
              }}
            />
            <TagMultiSelect
              label={t('songs.styleTags')}
              tags={styleTags}
              selectedIds={selectedIds.filter((id) =>
                styleTags.some((tag) => tag.id === id)
              )}
              onChange={(ids) => {
                const types = selectedIds.filter((id) =>
                  typeTags.some((tag) => tag.id === id)
                )
                setSelectedIds([...types, ...ids])
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('songs.saving')}
              </>
            ) : (
              t('songs.saveTags')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
