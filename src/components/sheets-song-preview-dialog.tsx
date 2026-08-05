'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SongDetail = {
  id: string
  title: string
  artist: string | null
  lyrics: string | null
  audioFile: string | null
  listenUrl: string | null
  sheetLinkUrl: string | null
}

type SheetsSongPreviewDialogProps = {
  songId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SheetsSongPreviewDialog({
  songId,
  open,
  onOpenChange,
}: SheetsSongPreviewDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [song, setSong] = useState<SongDetail | null>(null)

  useEffect(() => {
    if (!open || !songId) {
      setSong(null)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const response = await fetch(`/api/songs/${songId}`)
        if (!response.ok) return
        const data = (await response.json()) as SongDetail
        if (!cancelled) setSong(data)
      } catch (error) {
        console.error('Failed to load song preview:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, songId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{song?.title ?? t('sheets.songPreview')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex shrink-0 items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('sheets.loading')}
          </div>
        ) : song ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {song.artist ? (
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            ) : null}

            {song.audioFile ? (
              <audio controls src={song.audioFile} className="w-full" preload="none" />
            ) : (
              <p className="text-sm text-muted-foreground">{t('sheets.noAudio')}</p>
            )}

            {song.listenUrl ? (
              <a
                href={song.listenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm text-primary underline"
              >
                {t('songs.listenOnline')}
              </a>
            ) : null}

            {song.sheetLinkUrl ? (
              <a
                href={song.sheetLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm text-primary underline"
              >
                {t('songs.sheetOnline')}
              </a>
            ) : null}

            {song.lyrics?.trim() ? (
              <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                {song.lyrics}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">{t('sheets.noLyrics')}</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
