'use client'

import { Check, Minus, Music2, Plus, ScrollText } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SheetsSongItem = {
  id: string
  title: string
  artist: string | null
  sheetMusic?: string | null
  audioFile?: string | null
}

type SheetsSongRowProps = {
  song: SheetsSongItem
  selected?: boolean
  playing?: boolean
  meta?: string
  onAdd: () => void
  onPreview: () => void
  onPlay?: () => void
  showAdd?: boolean
  className?: string
}

export function SheetsSongRow({
  song,
  selected = false,
  playing = false,
  meta,
  onAdd,
  onPreview,
  onPlay,
  showAdd = true,
  className,
}: SheetsSongRowProps) {
  const { t } = useI18n()
  const hasSheet = Boolean(song.sheetMusic?.trim())
  const hasAudio = Boolean(song.audioFile?.trim())

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5',
        selected ? 'bg-primary/5 opacity-60' : 'hover:bg-muted/50',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{song.title}</p>
          {hasSheet ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={t('sheets.hasSheet')} />
          ) : (
            <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-label={t('sheets.noSheet')} />
          )}
        </div>
        {(song.artist || meta) && (
          <p className="truncate text-xs text-muted-foreground">
            {[song.artist, meta].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onPreview}
          aria-label={t('sheets.viewLyrics')}
        >
          <ScrollText className="h-4 w-4" />
        </Button>
        {hasAudio && onPlay ? (
          <Button
            type="button"
            variant={playing ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={onPlay}
            aria-label={t('sheets.playAudio')}
          >
            <Music2 className="h-4 w-4" />
          </Button>
        ) : null}
        {showAdd ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={selected}
            onClick={onAdd}
            aria-label={t('sheets.addSong')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
