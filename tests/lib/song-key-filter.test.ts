import { describe, expect, it } from 'vitest'
import {
  aggregateSongKeys,
  buildSongKeyWhere,
  parseSongKeyParamsFromSearchParams,
} from '@/lib/song-key-filter'

describe('song-key-filter', () => {
  it('parseSongKeyParamsFromSearchParams dedupes keys', () => {
    const params = new URLSearchParams('keys=C&keys=Am&keys=c')
    expect(parseSongKeyParamsFromSearchParams(params)).toEqual(['C', 'Am', 'c'])
  })

  it('buildSongKeyWhere uses case-insensitive equals for one key', () => {
    expect(buildSongKeyWhere(['C'])).toEqual({
      key: { equals: 'C', mode: 'insensitive' },
    })
  })

  it('buildSongKeyWhere ORs multiple keys', () => {
    expect(buildSongKeyWhere(['C', 'Am'])).toEqual({
      OR: [
        { key: { equals: 'C', mode: 'insensitive' } },
        { key: { equals: 'Am', mode: 'insensitive' } },
      ],
    })
  })

  it('aggregateSongKeys merges case variants and counts', () => {
    expect(
      aggregateSongKeys([
        { key: 'C' },
        { key: 'c' },
        { key: 'Am' },
        { key: null },
        { key: '  ' },
      ]),
    ).toEqual([
      { key: 'Am', count: 1 },
      { key: 'C', count: 2 },
    ])
  })
})
