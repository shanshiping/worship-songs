'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'
import { SONG_INDEX_LETTERS, type SongIndexLetter } from '@/lib/song-title-index'

type SongLetterIndexProps = {
  letters: Array<{ letter: SongIndexLetter; count: number }>
  selected: SongIndexLetter | ''
  onSelect: (letter: SongIndexLetter | '') => void
}

export function SongLetterIndex({ letters, selected, onSelect }: SongLetterIndexProps) {
  const { t } = useI18n()
  const countByLetter = new Map(letters.map((item) => [item.letter, item.count]))

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('songs.indexByLetter')}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            selected === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          )}
        >
          {t('songs.allLetters')}
        </button>
        {SONG_INDEX_LETTERS.map((letter) => {
          const count = countByLetter.get(letter) ?? 0
          const enabled = count > 0
          return (
            <button
              key={letter}
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(letter)}
              title={enabled ? t('songs.letterCount', { letter, count }) : undefined}
              className={cn(
                'min-w-7 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                selected === letter
                  ? 'bg-primary text-primary-foreground'
                  : enabled
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    : 'cursor-not-allowed bg-muted/40 text-muted-foreground/40',
              )}
            >
              {letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
