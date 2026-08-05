import { describe, expect, it } from 'vitest'
import {
  buildLeaderSongStats,
  sortLeadersByRecentAppearance,
} from '@/lib/leader-songs'

describe('buildLeaderSongStats', () => {
  const rows = [
    {
      leader: 'Alice',
      meetingId: 'm1',
      meetingDate: '2026-01-01',
      songId: 's1',
      song: { id: 's1', title: 'Song A', artist: null },
    },
    {
      leader: 'Alice',
      meetingId: 'm1',
      meetingDate: '2026-01-01',
      songId: 's2',
      song: { id: 's2', title: 'Song B', artist: 'Artist' },
    },
    {
      leader: 'Alice',
      meetingId: 'm2',
      meetingDate: '2026-02-01',
      songId: 's1',
      song: { id: 's1', title: 'Song A', artist: null },
    },
    {
      leader: 'Bob',
      meetingId: 'm3',
      meetingDate: '2026-03-01',
      songId: 's2',
      song: { id: 's2', title: 'Song B', artist: 'Artist' },
    },
  ]

  it('groups songs by leader and ranks by count', () => {
    const stats = buildLeaderSongStats(rows)

    expect(stats).toHaveLength(2)
    expect(stats[0].leader).toBe('Bob')
    expect(stats[1].leader).toBe('Alice')
    expect(stats[1].meetingCount).toBe(2)
    expect(stats[1].totalSongCount).toBe(2)
    expect(stats[1].songs).toHaveLength(2)
    expect(stats[1].songs[0]).toMatchObject({ id: 's1', count: 2, rank: 1 })
    expect(stats[0].songs[0]).toMatchObject({ id: 's2', count: 1, rank: 1 })
  })

  it('returns all songs by default and respects limitPerLeader when set', () => {
    const manyRows = Array.from({ length: 12 }, (_, i) => ({
      leader: 'Alice',
      meetingId: `m${i}`,
      meetingDate: `2026-01-${String(i + 1).padStart(2, '0')}`,
      songId: `s${i}`,
      song: { id: `s${i}`, title: `Song ${i}`, artist: null },
    }))

    const all = buildLeaderSongStats(manyRows)
    expect(all[0].totalSongCount).toBe(12)
    expect(all[0].songs).toHaveLength(12)

    const limited = buildLeaderSongStats(manyRows, { limitPerLeader: 10 })
    expect(limited[0].totalSongCount).toBe(12)
    expect(limited[0].songs).toHaveLength(10)
  })

  it('sorts leaders by most recent meeting date descending', () => {
    const stats = buildLeaderSongStats([
      {
        leader: 'Old Leader',
        meetingId: 'm1',
        meetingDate: '2024-01-01',
        songId: 's1',
        song: { id: 's1', title: 'A', artist: null },
      },
      {
        leader: 'New Leader',
        meetingId: 'm2',
        meetingDate: '2026-06-01',
        songId: 's2',
        song: { id: 's2', title: 'B', artist: null },
      },
      {
        leader: 'Mid Leader',
        meetingId: 'm3',
        meetingDate: '2025-03-01',
        songId: 's3',
        song: { id: 's3', title: 'C', artist: null },
      },
    ])

    expect(stats.map((item) => item.leader)).toEqual([
      'New Leader',
      'Mid Leader',
      'Old Leader',
    ])
  })

  it('merges alias leader names under the canonical name', () => {
    const stats = buildLeaderSongStats([
      {
        leader: '黎明',
        meetingId: 'm1',
        meetingDate: '2026-01-01',
        songId: 's1',
        song: { id: 's1', title: 'Song A', artist: null },
      },
      {
        leader: '徐黎明',
        meetingId: 'm2',
        meetingDate: '2026-02-01',
        songId: 's1',
        song: { id: 's1', title: 'Song A', artist: null },
      },
      {
        leader: '海平',
        meetingId: 'm3',
        meetingDate: '2026-03-01',
        songId: 's2',
        song: { id: 's2', title: 'Song B', artist: null },
      },
      {
        leader: '王海平',
        meetingId: 'm4',
        meetingDate: '2026-04-01',
        songId: 's2',
        song: { id: 's2', title: 'Song B', artist: null },
      },
    ])

    expect(stats).toHaveLength(2)
    expect(stats[0].leader).toBe('王海平')
    expect(stats[1].leader).toBe('黎明')
    expect(stats.find((item) => item.leader === '黎明')).toMatchObject({
      meetingCount: 2,
      songs: [{ id: 's1', count: 2 }],
    })
    expect(stats.find((item) => item.leader === '王海平')).toMatchObject({
      meetingCount: 2,
      songs: [{ id: 's2', count: 2 }],
    })
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
        meetingDate: '2026-04-01',
        songId: 's9',
        song: { id: 's9', title: 'Ignored', artist: null },
      },
    ])

    expect(stats.every((item) => item.leader)).toBe(true)
    expect(stats).toHaveLength(2)
  })
})

describe('sortLeadersByRecentAppearance', () => {
  it('orders leaders by latest meeting date', () => {
    const names = sortLeadersByRecentAppearance([
      { leader: 'Alice', date: '2025-01-01' },
      { leader: 'Bob', date: '2026-05-01' },
      { leader: 'Alice', date: '2026-01-01' },
      { leader: 'Carol', date: '2024-12-01' },
    ])

    expect(names).toEqual(['Bob', 'Alice', 'Carol'])
  })
})
