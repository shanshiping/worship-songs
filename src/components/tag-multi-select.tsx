'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TagItem = {
  id: string
  name: string
  kind: string
}

type TagMultiSelectProps = {
  label: string
  tags: TagItem[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

export function TagMultiSelect({
  label,
  tags,
  selectedIds,
  onChange,
  className,
}: TagMultiSelectProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              )}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SongTagBadges({
  tags,
}: {
  tags?: Array<{ tag: TagItem }>
}) {
  if (!tags || tags.length === 0) {
    return <Badge variant="secondary">未分类</Badge>
  }
  return (
    <>
      {tags.map((st) => (
        <Badge
          key={st.tag.id}
          variant={st.tag.kind === 'STYLE' ? 'outline' : 'secondary'}
        >
          {st.tag.name}
        </Badge>
      ))}
    </>
  )
}
