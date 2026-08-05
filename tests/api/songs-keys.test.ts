import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/songs/keys/route'

describe('GET /api/songs/keys', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns aggregated keys with counts', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { key: 'C' },
      { key: 'c' },
      { key: 'Am' },
    ])

    const res = await GET(jsonRequest('http://localhost/api/songs/keys'))
    const { status, body } = await readJson<{
      keys: Array<{ key: string; count: number }>
    }>(res)

    expect(status).toBe(200)
    expect(body.keys).toEqual([
      { key: 'Am', count: 1 },
      { key: 'C', count: 2 },
    ])
  })
})
