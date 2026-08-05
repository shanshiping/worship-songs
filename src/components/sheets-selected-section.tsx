'use client'

import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { SheetsSongRow, type SheetsSongItem } from '@/components/sheets-song-row'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SheetsSelectedSectionProps = {
  title: string
  optional?: boolean
  songs: SheetsSongItem[]
  emptyText: string
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (songId: string) => void
  songRowProps: (song: SheetsSongItem) => {
    song: SheetsSongItem
    selected: boolean
    playing: boolean
    meta?: string
    onAdd: () => void
    onPreview: () => void
    onPlay?: () => void
    showAdd?: boolean
    className?: string
  }
  className?: string
}

export function SheetsSelectedSection({
  title,
  optional = false,
  songs,
  emptyText,
  onMove,
  onRemove,
  songRowProps,
  className,
}: SheetsSelectedSectionProps) {
  const { t } = useI18n()

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-xs font-medium text-muted-foreground">
        {title}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground/80">
            ({t('sheets.optional')})
          </span>
        ) : null}
      </p>
      {songs.length > 0 ? (
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-1 rounded-md bg-muted/40 py-0.5 pr-0.5 pl-1"
            >
              <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>
              <SheetsSongRow
                {...songRowProps(song)}
                showAdd={false}
                className="min-w-0 flex-1 px-0 hover:bg-transparent"
              />
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                  aria-label={t('sheets.moveUp')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === songs.length - 1}
                  onClick={() => onMove(index, 1)}
                  aria-label={t('sheets.moveDown')}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(song.id)}
                  aria-label={t('sheets.remove')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-2 py-2 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      )}
    </div>
  )
}
