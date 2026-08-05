import { describe, expect, it } from 'vitest'
import {
  chunkLines,
  extractArtistFromLyrics,
  extractLyricsCredits,
  isSectionLabel,
  parseLyricsSections,
  parseSectionLabel,
  resolveLyricsText,
  splitLyricsParagraphs,
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

  it('removes metadata lines even when song record has no matching fields', () => {
    const lyrics = `词：李四
曲：王五
演唱：某团
第一段
行一`

    expect(stripLeadingLyricsMetadata(lyrics, { title: '某歌' })).toBe(`第一段
行一`)
  })
})

describe('extractLyricsCredits', () => {
  it('collects 词/曲/演唱 for the title slide', () => {
    const lyrics = `词：张三
曲：李四
演唱：王五
副歌
行一`

    expect(
      extractLyricsCredits(lyrics, { title: '神掌权' })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '演唱：王五'],
      body: '副歌\n行一',
    })
  })

  it('fills credits from song metadata when lyrics omit them', () => {
    expect(
      extractLyricsCredits('副歌\n行一', {
        title: '神掌权',
        lyricist: '张三',
        composer: '李四',
        artist: '敬拜团',
      })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '演唱：敬拜团'],
      body: '副歌\n行一',
    })
  })

  it('supports label on one line and value on the next', () => {
    expect(
      extractLyricsCredits(`词
张三
曲
李四
编曲
王五
演唱
赵六
副歌
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '编曲：王五', '演唱：赵六'],
      body: '副歌\n行一',
    })
  })

  it('supports 词曲 combined label and inline multiple credits', () => {
    expect(
      extractLyricsCredits(`词曲：张三
词：李四  曲：王五
副歌
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['词：李四', '曲：王五', '词曲：张三'],
      body: '副歌\n行一',
    })
  })

  it('prefers song metadata over duplicate lyrics credits', () => {
    expect(
      extractLyricsCredits(`词：歌词里的作者
曲：歌词里的作曲
副歌
行一`, {
        title: '神掌权',
        lyricist: '数据库作词',
        composer: '数据库作曲',
      })
    ).toEqual({
      credits: ['词：数据库作词', '曲：数据库作曲'],
      body: '副歌\n行一',
    })
  })

  it('pulls metadata lines from anywhere in lyrics text', () => {
    expect(
      extractLyricsCredits(`副歌
词：张三
曲：李四
编曲：王五
演唱：赵六
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '编曲：王五', '演唱：赵六'],
      body: '副歌\n行一',
    })
  })

  it('orders credits as 词/曲/编曲/制作/演唱 on the title slide', () => {
    expect(
      extractLyricsCredits(
        `演唱：赵六
制作：钱七
编曲：王五
曲：李四
词：张三
副歌
行一`,
        { title: '神掌权' }
      )
    ).toEqual({
      credits: ['词：张三', '曲：李四', '编曲：王五', '制作：钱七', '演唱：赵六'],
      body: '副歌\n行一',
    })
  })

  it('includes 制作 and 制作人 as separate title credits', () => {
    expect(
      extractLyricsCredits(`词：张三
曲：李四
编曲：王五
制作：某团队
制作人：周八
演唱：赵六
第一段
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '编曲：王五', '制作：某团队', '制作人：周八', '演唱：赵六'],
      body: '第一段\n行一',
    })
  })

  it('normalizes space-separated metadata lines', () => {
    expect(
      extractLyricsCredits(`作词 张三
作曲 李四
编曲 王五
制作 某团队
演唱 赵六
第一段
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['作词：张三', '作曲：李四', '编曲：王五', '制作：某团队', '演唱：赵六'],
      body: '第一段\n行一',
    })
  })

  it('keeps all credit lines on title slide and off lyric pages', () => {
    expect(
      extractLyricsCredits(`副歌
词 张三
曲 李四
编曲 王五
制作 团队
演唱 赵六
行一`, { title: '神掌权' })
    ).toEqual({
      credits: ['词：张三', '曲：李四', '编曲：王五', '制作：团队', '演唱：赵六'],
      body: '副歌\n行一',
    })
  })
})

describe('splitLyricsParagraphs', () => {
  it('splits stanzas by blank lines', () => {
    expect(
      splitLyricsParagraphs(`行一
行二

行三
行四`)
    ).toEqual([
      ['行一', '行二'],
      ['行三', '行四'],
    ])
  })
})

describe('extractArtistFromLyrics', () => {
  it('reads author from 词/作者 lines', () => {
    expect(extractArtistFromLyrics('词：张三\n第一段\n行一')).toBe('张三')
    expect(extractArtistFromLyrics('作者：李四\n行一')).toBe('李四')
  })
})
