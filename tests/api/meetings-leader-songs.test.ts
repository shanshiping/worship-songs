import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/meetings/leader-songs/route'

describe('/api/meetings/leader-songs', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns leader song stats', async () => {
    mockPrisma.meetingSong.findMany.mockResolvedValue([
      {
        songId: 's1',
        meeting: { id: 'm1', leader: 'Alice' },
        song: { id: 's1', title: 'Song A', artist: null },
      },
      {
        songId: 's1',
        meeting: { id: 'm2', leader: 'Alice' },
        song: { id: 's1', title: 'Song A', artist: null },
      },
    ])
    mockPrisma.meeting.findMany
      .mockResolvedValueOnce([{ leader: 'Alice' }])
      .mockResolvedValueOnce([{ date: new Date('2026-01-01') }])

    const res = await GET(
      jsonRequest('http://localhost/api/meetings/leader-songs?year=2026&leader=Alice')
    )
    const { status, body } = await readJson<{
      year: number
      leader: string
      leaders: string[]
      years: number[]
      stats: Array<{ leader: string; meetingCount: number; songs: Array<{ count: number }> }>
    }>(res)

    expect(status).toBe(200)
    expect(body.year).toBe(2026)
    expect(body.leader).toBe('Alice')
    expect(body.leaders).toEqual(['Alice'])
    expect(body.years).toEqual([2026])
    expect(body.stats).toHaveLength(1)
    expect(body.stats[0].meetingCount).toBe(2)
    expect(body.stats[0].songs[0].count).toBe(2)
  })
})
