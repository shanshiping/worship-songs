import { describe, expect, it } from 'vitest'
import {
  isTagKind,
  normalizeTagName,
  parseTagKind,
} from '@/lib/tags'

describe('tags', () => {
  it('normalizeTagName trims and validates', () => {
    expect(normalizeTagName('  敬拜赞美  ')).toBe('敬拜赞美')
    expect(normalizeTagName('')).toBeNull()
    expect(normalizeTagName('   ')).toBeNull()
    expect(normalizeTagName('a'.repeat(51))).toBeNull()
  })

  it('parseTagKind accepts TYPE and STYLE only', () => {
    expect(parseTagKind('TYPE')).toBe('TYPE')
    expect(parseTagKind('STYLE')).toBe('STYLE')
    expect(parseTagKind('OTHER')).toBeNull()
  })

  it('isTagKind is a type guard', () => {
    expect(isTagKind('TYPE')).toBe(true)
    expect(isTagKind('STYLE')).toBe(true)
    expect(isTagKind('X')).toBe(false)
  })
})
