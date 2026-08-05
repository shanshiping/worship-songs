import { describe, expect, it } from 'vitest'
import {
  isValidScriptureReference,
  MIN_SCRIPTURE_SEARCH_LENGTH,
} from '@/lib/scripture-recommendations'

describe('scripture-recommendations helpers', () => {
  it('requires minimum reference length', () => {
    expect(MIN_SCRIPTURE_SEARCH_LENGTH).toBe(2)
    expect(isValidScriptureReference('约')).toBe(false)
    expect(isValidScriptureReference(' 约翰 3:16 ')).toBe(true)
  })
})
