import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'

const searchMeetingsByTheme = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/meeting-theme-search', async () => {
  const actual = await vi.importActual<typeof import('@/lib/meeting-theme-search')>(
    '@/lib/meeting-theme-search',
  )
  return {
    ...actual,
    searchMeetingsByTheme: (...args: unknown[]) => searchMeetingsByTheme(...args),
  }
})

import { GET } from '@/app/api/meetings/route'

describe('GET /api/meetings themeSearch', () => {
  beforeEach(() => {
    resetPrismaMock()
    searchMeetingsByTheme.mockReset()
  })

  it('returns 400 when themeSearch is too short', async () => {
    const res = await GET(new Request('http://localhost/api/meetings?themeSearch=a'))
    expect(res.status).toBe(400)
  })

  it('returns theme search results', async () => {
    searchMeetingsByTheme.mockResolvedValue([
      {
        id: 'm1',
        date: '2026-01-01T00:00:00.000Z',
        theme: '复活节',
        leader: '张三',
        songs: [],
      },
    ])

    const res = await GET(
      new Request('http://localhost/api/meetings?themeSearch=复活&limit=5'),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(searchMeetingsByTheme).toHaveBeenCalledWith('复活', 5)
    expect(body.meetings).toHaveLength(1)
  })
})
