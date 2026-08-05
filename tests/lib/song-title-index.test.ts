import { describe, expect, it } from 'vitest'
import {
  compareSongTitles,
  getSongTitleInitial,
  getTitleInitialOrder,
  isSongIndexLetter,
  SONG_INDEX_LETTERS,
} from '@/lib/song-title-index'

describe('song-title-index', () => {
  it('uses latin initials directly', () => {
    expect(getSongTitleInitial('Amazing Grace')).toBe('A')
    expect(getSongTitleInitial('hello')).toBe('H')
  })

  it('derives chinese initials from pinyin', () => {
    expect(getSongTitleInitial('神掌权')).toBe('S')
    expect(getSongTitleInitial('赞美之泉')).toBe('Z')
  })

  it('falls back to hash for digits and symbols', () => {
    expect(getSongTitleInitial('123')).toBe('#')
    expect(getSongTitleInitial('《恩典')).toBe('#')
  })

  it('validates index letters', () => {
    expect(isSongIndexLetter('A')).toBe(true)
    expect(isSongIndexLetter('#')).toBe(true)
    expect(isSongIndexLetter('a')).toBe(false)
  })

  it('lists index letters from A to Z then hash', () => {
    expect(SONG_INDEX_LETTERS[0]).toBe('A')
    expect(SONG_INDEX_LETTERS.at(-1)).toBe('#')
  })

  it('orders hash bucket after Z', () => {
    expect(getTitleInitialOrder('A')).toBe(1)
    expect(getTitleInitialOrder('Z')).toBe(26)
    expect(getTitleInitialOrder('#')).toBe(27)
  })

  it('sorts titles with locale-aware compare', () => {
    expect(compareSongTitles('Alpha', 'Beta')).toBeLessThan(0)
    expect(compareSongTitles('赞美', '神掌权')).not.toBe(0)
  })
})
