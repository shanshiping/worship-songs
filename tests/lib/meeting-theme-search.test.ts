import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_SEARCH_LIMIT,
  isValidThemeSearchQuery,
  MIN_THEME_SEARCH_LENGTH,
} from '@/lib/meeting-theme-search'

describe('meeting-theme-search helpers', () => {
  it('requires minimum query length', () => {
    expect(MIN_THEME_SEARCH_LENGTH).toBe(2)
    expect(isValidThemeSearchQuery('a')).toBe(false)
    expect(isValidThemeSearchQuery(' 复活 ')).toBe(true)
  })

  it('uses a sensible default limit', () => {
    expect(DEFAULT_THEME_SEARCH_LIMIT).toBe(5)
  })
})
