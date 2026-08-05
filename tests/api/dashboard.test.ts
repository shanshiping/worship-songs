import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/dashboard/route'

describe('/api/dashboard', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns overview stats and latest meeting', async () => {
    mockPrisma.song.count.mockResolvedValue(10)
    mockPrisma.meeting.count.mockResolvedValue(5)
    mockPrisma.tag.count.mockResolvedValue(15)
    mockPrisma.meeting.findFirst.mockResolvedValue({
      id: 'm1',
      date: new Date('2026-08-01T10:00:00.000Z'),
      theme: '主恩永存',
      speaker: '张弟兄',
      leader: '李姊妹',
      type: 'MORNING',
      songs: [
        { song: { id: 's1', title: '神掌权' } },
        { song: { id: 's2', title: '赞美之泉' } },
      ],
    })

    const res = await GET()
    const { status, body } = await readJson<{
      totalSongs: number
      latestMeeting: {
        id: string
        theme: string
        songCount: number
        songs: Array<{ title: string }>
      } | null
    }>(res)

    expect(status).toBe(200)
    expect(body.totalSongs).toBe(10)
    expect(body.latestMeeting).toEqual({
      id: 'm1',
      date: '2026-08-01T10:00:00.000Z',
      theme: '主恩永存',
      speaker: '张弟兄',
      leader: '李姊妹',
      type: 'MORNING',
      songCount: 2,
      songs: [
        { id: 's1', title: '神掌权' },
        { id: 's2', title: '赞美之泉' },
      ],
    })
  })

  it('returns null latestMeeting when no meetings exist', async () => {
    mockPrisma.song.count.mockResolvedValue(0)
    mockPrisma.meeting.count.mockResolvedValue(0)
    mockPrisma.tag.count.mockResolvedValue(0)
    mockPrisma.meeting.findFirst.mockResolvedValue(null)

    const res = await GET()
    const { status, body } = await readJson<{ latestMeeting: null }>(res)

    expect(status).toBe(200)
    expect(body.latestMeeting).toBeNull()
  })
})
