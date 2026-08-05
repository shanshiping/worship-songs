import { describe, expect, it } from 'vitest'
import { buildSheetsShareText } from '@/lib/sheets-share-text'

const labels = {
  title: '本周诗歌如下',
  theme: '主题',
  scripture: '经文',
  arrangement: '编排顺序',
  mainSongList: '歌曲列表',
  responseSongList: '回应诗歌',
  communionSongList: '圣餐诗歌',
  listen: '试听',
  noListen: '（暂无试听链接）',
  sheet: '歌谱',
  noSheet: '（暂无歌谱链接）',
  webLink: '在线查看',
}

describe('buildSheetsShareText', () => {
  it('formats theme, arrangement, songs, and web link', () => {
    const text = buildSheetsShareText({
      theme: '复活节',
      arrangement: '开场快板 → 最后一首站立',
      mainSongs: [
        {
          title: 'Amazing Grace',
          listenUrl: 'https://music.example/a',
          sheetLinkUrl: 'https://sheet.example/a',
        },
        { title: 'How Great Thou Art', artist: 'Traditional' },
      ],
      responseSongs: [{ title: 'Response Song' }],
      shareUrl: 'https://app.example/share/sheets/abc',
      labels,
    })

    expect(text).toContain('【本周诗歌如下】')
    expect(text).toContain('主题：复活节')
    expect(text).toContain('歌曲列表')
    expect(text).toContain('1. Amazing Grace')
    expect(text).toContain('回应诗歌')
    expect(text).toContain('1. Response Song')
    expect(text).not.toContain('圣餐诗歌')
    expect(text).toContain('歌谱：https://sheet.example/a')
    expect(text).toContain('试听：https://music.example/a')
    expect(text).toContain('2. How Great Thou Art — Traditional')
    expect(text).toContain('（暂无歌谱链接）')
    expect(text).toContain('（暂无试听链接）')
    expect(text).toContain('在线查看：https://app.example/share/sheets/abc')
  })

  it('omits empty sections', () => {
    const text = buildSheetsShareText({
      mainSongs: [{
        title: 'Only Song',
        listenUrl: 'https://music.example/only',
        sheetLinkUrl: 'https://sheet.example/only',
      }],
      labels,
    })

    expect(text).not.toContain('主题：')
    expect(text).not.toContain('在线查看：')
    expect(text).not.toContain('回应诗歌')
    expect(text).not.toContain('圣餐诗歌')
    expect(text).toContain('1. Only Song')
    expect(text).toContain('歌谱：https://sheet.example/only')
  })

  it('includes communion section when songs are present', () => {
    const text = buildSheetsShareText({
      mainSongs: [{ title: 'Main Song' }],
      communionSongs: [{ title: 'Communion Song' }],
      labels,
    })

    expect(text).toContain('圣餐诗歌')
    expect(text).toContain('1. Communion Song')
  })
})
