import { describe, expect, it } from 'vitest'
import { parseLrc } from '@/lib/lrc'

describe('parseLrc', () => {
  it('parses timed lines', () => {
    expect(parseLrc('[00:12.00]Hello')).toEqual([
      { timeSec: 12, text: 'Hello' },
    ])
  })

  it('parses minutes and centiseconds', () => {
    expect(parseLrc('[01:02.50]Praise')).toEqual([
      { timeSec: 62.5, text: 'Praise' },
    ])
  })

  it('skips lines without timestamps', () => {
    const result = parseLrc('plain\n[00:01.00]A\n[ti:Song]')
    expect(result).toEqual([{ timeSec: 1, text: 'A' }])
  })

  it('returns empty for blank input', () => {
    expect(parseLrc('')).toEqual([])
    expect(parseLrc('   ')).toEqual([])
  })
})
