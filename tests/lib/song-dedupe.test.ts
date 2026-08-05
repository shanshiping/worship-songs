import { describe, expect, it } from 'vitest'
import {
  buildSongMergePlans,
  pickCanonicalSong,
  type SongForDedupe,
} from '@/lib/song-dedupe'

function song(
  partial: Partial<SongForDedupe> & Pick<SongForDedupe, 'id' | 'title'>,
): SongForDedupe {
  return {
    artist: null,
    key: null,
    timeSignature: null,
    composer: null,
    lyricist: null,
    team: null,
    album: null,
    mvUrl: null,
    coverImage: null,
    pptBackground: null,
    sheetMusic: null,
    sheetMusicPages: null,
    audioFile: null,
    lyrics: null,
    lyricsLrc: null,
    notes: null,
    createdAt: new Date('2026-01-01'),
    ...partial,
  }
}

describe('song-dedupe', () => {
  it('groups songs that only differ by semicolons', () => {
    const plans = buildSongMergePlans([
      song({ id: 'a', title: '主爱长存' }),
      song({ id: 'b', title: '主爱长存；' }),
    ])

    expect(plans).toHaveLength(1)
    expect(plans[0]?.duplicateIds).toEqual(['b'])
    expect(plans[0]?.canonicalTitle).toBe('主爱长存')
  })

  it('prefers the richer song as canonical', () => {
    const chosen = pickCanonicalSong([
      song({
        id: 'a',
        title: '主爱长存',
        lyrics: '完整歌词',
        sheetMusic: '/uploads/sheets/a.pdf',
        _count: { meetings: 2, playlists: 0, tags: 0, teamShares: 0, scriptures: 0 },
      }),
      song({
        id: 'b',
        title: '主爱长存；',
        createdAt: new Date('2020-01-01'),
      }),
    ])

    expect(chosen.id).toBe('a')
  })
})
