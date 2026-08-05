'use client'

import type { LucideIcon } from 'lucide-react'
import { FileText, Music2, Plus, ScrollText } from 'lucide-react'
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

function ResourceStatusIcon({
  icon: Icon,
  active,
  label,
}: {
  icon: LucideIcon
  active: boolean
  label: string
}) {
  return (
    <span className="inline-flex shrink-0" title={label} aria-label={label}>
      <Icon
        className={cn(
          'h-3.5 w-3.5',
          active ? 'text-emerald-600' : 'text-muted-foreground/30',
        )}
      />
    </span>
  )
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
        <p className="truncate text-sm font-medium">{song.title}</p>
        {(song.artist || meta) && (
          <p className="truncate text-xs text-muted-foreground">
            {[song.artist, meta].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ResourceStatusIcon
          icon={FileText}
          active={hasSheet}
          label={hasSheet ? t('sheets.hasSheet') : t('sheets.noSheet')}
        />
        {hasAudio && onPlay ? (
          <Button
            type="button"
            variant={playing ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="h-7 w-7"
            onClick={onPlay}
            aria-label={t('sheets.playAudio')}
            title={t('sheets.playAudio')}
          >
            <Music2 className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
        ) : (
          <ResourceStatusIcon
            icon={Music2}
            active={false}
            label={t('sheets.noAudio')}
          />
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
