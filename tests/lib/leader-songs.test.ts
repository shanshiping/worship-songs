import { describe, expect, it } from 'vitest'
import { buildLeaderSongStats } from '@/lib/leader-songs'

describe('buildLeaderSongStats', () => {
  const rows = [
    {
      leader: 'Alice',
      meetingId: 'm1',
      songId: 's1',
      song: { id: 's1', title: 'Song A', artist: null },
    },
    {
      leader: 'Alice',
      meetingId: 'm1',
      songId: 's2',
      song: { id: 's2', title: 'Song B', artist: 'Artist' },
    },
    {
      leader: 'Alice',
      meetingId: 'm2',
      songId: 's1',
      song: { id: 's1', title: 'Song A', artist: null },
    },
    {
      leader: 'Bob',
      meetingId: 'm3',
      songId: 's2',
      song: { id: 's2', title: 'Song B', artist: 'Artist' },
    },
  ]

  it('groups songs by leader and ranks by count', () => {
    const stats = buildLeaderSongStats(rows)

    expect(stats).toHaveLength(2)
    expect(stats[0].leader).toBe('Alice')
    expect(stats[0].meetingCount).toBe(2)
    expect(stats[0].songs[0]).toMatchObject({ id: 's1', count: 2, rank: 1 })
    expect(stats[1].leader).toBe('Bob')
    expect(stats[1].songs[0]).toMatchObject({ id: 's2', count: 1, rank: 1 })
  })

  it('filters by leader', () => {
    const stats = buildLeaderSongStats(rows, { leader: 'Bob' })

    expect(stats).toHaveLength(1)
    expect(stats[0].leader).toBe('Bob')
  })

  it('limits songs per leader', () => {
    const stats = buildLeaderSongStats(rows, { leader: 'Alice', limitPerLeader: 1 })

    expect(stats[0].songs).toHaveLength(1)
    expect(stats[0].songs[0].id).toBe('s1')
  })

  it('ignores rows without leader name', () => {
    const stats = buildLeaderSongStats([
      ...rows,
      {
        leader: '  ',
        meetingId: 'm4',
        songId: 's9',
        song: { id: 's9', title: 'Ignored', artist: null },
      },
    ])

    expect(stats.every((item) => item.leader)).toBe(true)
    expect(stats).toHaveLength(2)
  })
})
