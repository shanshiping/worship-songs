import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/leaderboard/route'

describe('/api/leaderboard', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns paginated leaderboard for a year', async () => {
    mockPrisma.meetingSong.groupBy.mockResolvedValue([
      { songId: 's1', _count: { songId: 5 } },
      { songId: 's2', _count: { songId: 3 } },
    ])
    mockPrisma.meeting.findMany.mockResolvedValue([
      { date: new Date('2026-02-01') },
      { date: new Date('2025-02-01') },
    ])
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: 'A',
        artist: null,
        tags: [{ tag: { id: 't1', name: '其他', kind: 'TYPE' } }],
      },
      {
        id: 's2',
        title: 'B',
        artist: null,
        tags: [{ tag: { id: 't2', name: '敬拜赞美', kind: 'TYPE' } }],
      },
    ])

    const res = await GET(
      jsonRequest('http://localhost/api/leaderboard?year=2026&page=1&pageSize=10')
    )
    const { status, body } = await readJson<{
      year: number
      page: number
      pageSize: number
      total: number
      years: number[]
      leaderboard: Array<{ rank: number; title: string; count: number }>
    }>(res)

    expect(status).toBe(200)
    expect(body.year).toBe(2026)
    expect(body.pageSize).toBe(10)
    expect(body.total).toBe(2)
    expect(body.years).toEqual([2026, 2025])
    expect(body.leaderboard[0].rank).toBe(1)
    expect(body.leaderboard[0].count).toBe(5)
    expect(body.leaderboard[0].id).toBe('s1')
  })

  it('skips orphaned meetingSong rows without a song record', async () => {
    mockPrisma.meetingSong.groupBy.mockResolvedValue([
      { songId: 's1', _count: { songId: 5 } },
      { songId: 'missing', _count: { songId: 2 } },
    ])
    mockPrisma.meeting.findMany.mockResolvedValue([{ date: new Date('2026-02-01') }])
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: 'A',
        artist: null,
        tags: [{ tag: { id: 't1', name: '其他', kind: 'TYPE' } }],
      },
    ])

    const res = await GET(jsonRequest('http://localhost/api/leaderboard?page=1&pageSize=10'))
    const { status, body } = await readJson<{
      total: number
      leaderboard: Array<{ id: string; title: string }>
    }>(res)

    expect(status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.leaderboard).toHaveLength(1)
    expect(body.leaderboard[0].id).toBe('s1')
    expect(body.leaderboard[0].title).toBe('A')
  })

  it('falls back pageSize to 20 when invalid', async () => {
    mockPrisma.meetingSong.groupBy.mockResolvedValue([])
    mockPrisma.meeting.findMany.mockResolvedValue([])
    mockPrisma.song.findMany.mockResolvedValue([])

    const res = await GET(
      jsonRequest('http://localhost/api/leaderboard?pageSize=99')
    )
    const { body } = await readJson<{ pageSize: number }>(res)
    expect(body.pageSize).toBe(20)
  })
})
