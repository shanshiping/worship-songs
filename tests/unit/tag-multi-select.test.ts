import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SongTagBadges, type TagItem } from '@/components/tag-multi-select'

const typeTag: TagItem = {
  id: 'type-1',
  name: '敬拜',
  kind: 'TYPE',
}

describe('SongTagBadges', () => {
  it('renders clickable tag badges as buttons when a tag click handler is provided', () => {
    const html = renderToStaticMarkup(
      createElement(SongTagBadges, {
        tags: [{ tag: typeTag }],
        onTagClick: vi.fn(),
      })
    )

    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('敬拜')
  })

  it('keeps static badge markup when no click handlers are provided', () => {
    const html = renderToStaticMarkup(
      createElement(SongTagBadges, {
        tags: [{ tag: typeTag }],
      })
    )

    expect(html).toContain('<span')
    expect(html).not.toContain('<button')
  })

  it('renders uncategorized as a button only when its handler is provided', () => {
    const html = renderToStaticMarkup(
      createElement(SongTagBadges, {
        tags: [],
        onUncategorizedClick: vi.fn(),
      })
    )

    expect(html).toContain('<button')
    expect(html).toContain('未分类')
  })
})
