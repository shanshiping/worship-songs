import { describe, expect, it } from 'vitest'
import {
  normalizeSongTitle,
  songDedupeKey,
  songTitleNeedsNormalization,
} from '@/lib/song-title-normalize'

describe('song-title-normalize', () => {
  it('removes ASCII and full-width semicolons', () => {
    expect(normalizeSongTitle('奇妙恩典;')).toBe('奇妙恩典')
    expect(normalizeSongTitle('奇妙恩典；')).toBe('奇妙恩典')
    expect(normalizeSongTitle('歌A；歌B')).toBe('歌A歌B')
  })

  it('collapses whitespace', () => {
    expect(normalizeSongTitle('  Amazing   Grace  ')).toBe('Amazing Grace')
  })

  it('builds dedupe keys case-insensitively', () => {
    expect(songDedupeKey('Amazing Grace')).toBe('amazing grace')
    expect(songDedupeKey('Amazing Grace;')).toBe('amazing grace')
  })

  it('detects titles needing cleanup', () => {
    expect(songTitleNeedsNormalization('歌名；')).toBe(true)
    expect(songTitleNeedsNormalization('歌名')).toBe(false)
  })
})
