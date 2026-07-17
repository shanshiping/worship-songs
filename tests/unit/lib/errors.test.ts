import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '@/lib/errors'

describe('getErrorMessage', () => {
  it('returns Error.message when present', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage('nope', 'fallback')).toBe('fallback')
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage({}, 'fallback')).toBe('fallback')
  })

  it('returns fallback for Error with empty message', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback')
  })
})
