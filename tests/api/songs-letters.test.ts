import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/songs/letters/route'

describe('GET /api/songs/letters', () => {
  beforeEach(() => {
    resetPrismaMock()
    mockPrisma.song.update.mockResolvedValue({})
  })

  it('returns letter counts after syncing initials', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's1', title: 'Amazing Grace', titleInitial: 'A', titleInitialOrder: 1 },
      { id: 's2', title: '神掌权', titleInitial: 'S', titleInitialOrder: 19 },
    ])

    const res = await GET()
    const { status, body } = await readJson<{
      letters: Array<{ letter: string; count: number }>
    }>(res)

    expect(status).toBe(200)
    expect(body.letters[0]).toEqual({ letter: 'A', count: 1 })
    expect(body.letters).toEqual(
      expect.arrayContaining([
        { letter: 'A', count: 1 },
        { letter: 'S', count: 1 },
      ]),
    )
  })
})
