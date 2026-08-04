import { describe, expect, it } from 'vitest'
import {
  chunkLines,
  extractArtistFromLyrics,
  isSectionLabel,
  parseLyricsSections,
  parseSectionLabel,
  resolveLyricsText,
  stripLeadingLyricsMetadata,
} from '@/lib/lyrics-sections'

describe('parseSectionLabel', () => {
  it('recognizes Chinese section labels', () => {
    expect(parseSectionLabel('副歌')).toBe('副歌')
    expect(parseSectionLabel('副歌：')).toBe('副歌')
    expect(parseSectionLabel('第一段')).toBe('第一段')
    expect(parseSectionLabel('第二段：')).toBe('第二段')
    expect(parseSectionLabel('桥段')).toBe('桥段')
    expect(parseSectionLabel('主歌1')).toBe('主歌1')
    expect(parseSectionLabel('一段')).toBe('一段')
    expect(parseSectionLabel('1段')).toBe('1段')
  })

  it('recognizes wrapped section labels', () => {
    expect(parseSectionLabel('[副歌]')).toBe('副歌')
    expect(parseSectionLabel('（第一段）')).toBe('第一段')
    expect(parseSectionLabel('【副歌】')).toBe('副歌')
    expect(parseSectionLabel('*Bridge*')).toBe('Bridge')
  })

  it('recognizes English section labels', () => {
    expect(parseSectionLabel('Verse 1')).toBe('Verse 1')
    expect(parseSectionLabel('Chorus')).toBe('Chorus')
    expect(parseSectionLabel('Pre-Chorus')).toBe('Pre-Chorus')
    expect(parseSectionLabel('Bridge:')).toBe('Bridge')
    expect(parseSectionLabel('V1')).toBe('V1')
    expect(parseSectionLabel('(2)')).toBe('(2)')
  })

  it('rejects regular lyric lines', () => {
    expect(parseSectionLabel('哈利路亚')).toBeNull()
    expect(parseSectionLabel('Praise the Lord')).toBeNull()
  })
})

describe('isSectionLabel', () => {
  it('delegates to parseSectionLabel', () => {
    expect(isSectionLabel('[副歌]')).toBe(true)
    expect(isSectionLabel('哈利路亚')).toBe(false)
  })
})

describe('parseLyricsSections', () => {
  it('splits by section labels', () => {
    const lyrics = `第一段
行一
行二
副歌
行三
行四`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: '第一段', lines: ['行一', '行二'] },
      { label: '副歌', lines: ['行三', '行四'] },
    ])
  })

  it('groups leading lines without a label', () => {
    const lyrics = `行一
行二
副歌
行三`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: null, lines: ['行一', '行二'] },
      { label: '副歌', lines: ['行三'] },
    ])
  })

  it('keeps blank lines inside a short section', () => {
    const lyrics = `第一段

行一

行二`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: '第一段', lines: ['行一', '行二'] },
    ])
  })

  it('splits paragraphs separated by blank lines', () => {
    const lyrics = `行一
行二

行三
行四`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: null, lines: ['行一', '行二'] },
      { label: null, lines: ['行三', '行四'] },
    ])
  })

  it('supports a label on its own line before the next paragraph', () => {
    const lyrics = `副歌

行一
行二`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: '副歌', lines: ['行一', '行二'] },
    ])
  })

  it('supports bracketed labels from OCR', () => {
    const lyrics = `[第一段]
行一
行二
【副歌】
行三
行四`

    expect(parseLyricsSections(lyrics)).toEqual([
      { label: '第一段', lines: ['行一', '行二'] },
      { label: '副歌', lines: ['行三', '行四'] },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseLyricsSections('')).toEqual([])
    expect(parseLyricsSections('   \n  ')).toEqual([])
  })
})

describe('resolveLyricsText', () => {
  it('prefers plain lyrics', () => {
    expect(resolveLyricsText('Hello\nWorld', '[00:01.00]LRC')).toBe('Hello\nWorld')
  })

  it('falls back to LRC text when plain lyrics are empty', () => {
    expect(
      resolveLyricsText(null, '[00:12.00]哈利路亚\n[00:15.00]赞美主')
    ).toBe('哈利路亚\n赞美主')
  })

  it('returns empty when both sources are missing', () => {
    expect(resolveLyricsText(null, null)).toBe('')
  })
})

describe('chunkLines', () => {
  it('splits lines into chunks of 4', () => {
    expect(chunkLines(['a', 'b', 'c', 'd', 'e'], 4)).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e'],
    ])
  })

  it('returns empty for no lines', () => {
    expect(chunkLines([], 4)).toEqual([])
  })
})

describe('stripLeadingLyricsMetadata', () => {
  it('removes duplicated title and artist lines before lyrics', () => {
    const lyrics = `神掌权
张三
第一段
行一
行二`

    expect(
      stripLeadingLyricsMetadata(lyrics, {
        title: '神掌权',
        artist: '张三',
      })
    ).toBe(`第一段
行一
行二`)
  })

  it('removes labeled metadata lines at the top', () => {
    const lyrics = `词：李四
曲：王五
副歌
行一`

    expect(
      stripLeadingLyricsMetadata(lyrics, {
        title: '某歌',
        lyricist: '李四',
        composer: '王五',
      })
    ).toBe(`副歌
行一`)
  })
})

describe('extractArtistFromLyrics', () => {
  it('reads author from 词/作者 lines', () => {
    expect(extractArtistFromLyrics('词：张三\n第一段\n行一')).toBe('张三')
    expect(extractArtistFromLyrics('作者：李四\n行一')).toBe('李四')
  })
})
