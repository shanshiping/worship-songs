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

  it('returns overview stats and top songs', async () => {
    mockPrisma.song.count.mockResolvedValue(10)
    mockPrisma.meeting.count.mockResolvedValue(5)
    mockPrisma.tag.count.mockResolvedValue(15)
    mockPrisma.meetingSong.groupBy.mockResolvedValue([
      { songId: 's1', _count: { songId: 4 } },
    ])
    mockPrisma.song.findUnique.mockResolvedValue({ id: 's1', title: '神掌权' })

    const res = await GET()
    const { status, body } = await readJson<{
      totalSongs: number
      topSongs: Array<{ title: string; count: number }>
    }>(res)

    expect(status).toBe(200)
    expect(body.totalSongs).toBe(10)
    expect(body.topSongs[0]).toEqual({ title: '神掌权', count: 4 })
  })
})
