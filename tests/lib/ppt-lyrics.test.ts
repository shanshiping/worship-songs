import { describe, expect, it } from 'vitest'
import { buildLyricsPpt } from '@/lib/ppt-lyrics'

describe('buildLyricsPpt', () => {
  it('generates a pptx buffer with title, credits, and lyric sections', async () => {
    const buffer = await buildLyricsPpt([
      {
        title: '神掌权',
        lyricist: '张三',
        composer: '李四',
        artist: '敬拜团',
        lyrics: `词：张三
曲：李四
演唱：敬拜团
副歌
行一
行二

行三
行四`,
      },
    ])

    expect(buffer.byteLength).toBeGreaterThan(5000)
  })

  it('merges multiple songs into one deck', async () => {
    const buffer = await buildLyricsPpt([
      { title: '歌一', lyrics: '第一段\n行一' },
      { title: '歌二', lyrics: '副歌\n行二' },
    ])

    expect(buffer.byteLength).toBeGreaterThan(8000)
  })
})
