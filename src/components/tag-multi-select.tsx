'use client'

import type { JSX, MouseEvent } from 'react'

import { Badge, badgeVariants } from '@/components/ui/badge'
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
  onTagClick,
  onUncategorizedClick,
}: {
  tags?: Array<{ tag: TagItem }>
  onTagClick?: (tag: TagItem) => void
  onUncategorizedClick?: () => void
}): JSX.Element {
  const stopLinkNavigation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
  }

  if (!tags || tags.length === 0) {
    if (onUncategorizedClick) {
      return (
        <button
          type="button"
          className={cn(
            badgeVariants({ variant: 'secondary' }),
            'cursor-pointer hover:opacity-80'
          )}
          onClick={(event) => {
            stopLinkNavigation(event)
            onUncategorizedClick()
          }}
        >
          未分类
        </button>
      )
    }

    return <Badge variant="secondary">未分类</Badge>
  }

  return (
    <>
      {tags.map((st) => {
        const variant = st.tag.kind === 'STYLE' ? 'outline' : 'secondary'

        if (onTagClick) {
          return (
            <button
              key={st.tag.id}
              type="button"
              className={cn(
                badgeVariants({ variant }),
                'cursor-pointer hover:opacity-80'
              )}
              onClick={(event) => {
                stopLinkNavigation(event)
                onTagClick(st.tag)
              }}
            >
              {st.tag.name}
            </button>
          )
        }

        return (
          <Badge key={st.tag.id} variant={variant}>
            {st.tag.name}
          </Badge>
        )
      })}
    </>
  )
}
