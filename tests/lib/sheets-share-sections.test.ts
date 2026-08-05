import { describe, expect, it } from 'vitest'
import {
  groupSongsBySection,
  isSheetsShareSection,
} from '@/lib/sheets-share-sections'

describe('sheets-share-sections', () => {
  it('isSheetsShareSection validates known sections', () => {
    expect(isSheetsShareSection('main')).toBe(true)
    expect(isSheetsShareSection('response')).toBe(true)
    expect(isSheetsShareSection('communion')).toBe(true)
    expect(isSheetsShareSection('other')).toBe(false)
  })

  it('groupSongsBySection groups and sorts by order', () => {
    const grouped = groupSongsBySection([
      { section: 'response', order: 2, id: 'r2' },
      { section: 'main', order: 2, id: 'm2' },
      { section: 'main', order: 1, id: 'm1' },
      { section: null, order: 1, id: 'legacy' },
    ])

    expect(grouped.main.map((item) => item.id)).toEqual(['m1', 'legacy', 'm2'])
    expect(grouped.response.map((item) => item.id)).toEqual(['r2'])
    expect(grouped.communion).toEqual([])
  })
})
