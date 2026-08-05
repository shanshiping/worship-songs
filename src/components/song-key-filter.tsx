'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'

type SongKeyFilterProps = {
  keys: Array<{ key: string; count: number }>
  selectedKeys: string[]
  onChange: (keys: string[]) => void
}

export function SongKeyFilter({ keys, selectedKeys, onChange }: SongKeyFilterProps) {
  const { t } = useI18n()

  const toggle = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((item) => item !== key))
    } else {
      onChange([...selectedKeys, key])
    }
  }

  if (keys.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('songs.filterByKey')}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            selectedKeys.length === 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          )}
        >
          {t('songs.allKeys')}
        </button>
        {keys.map((item) => {
          const selected = selectedKeys.includes(item.key)
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              title={t('songs.keyCount', { key: item.key, count: item.count })}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {item.key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
