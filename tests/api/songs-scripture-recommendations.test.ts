import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'

const getScriptureRecommendations = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/scripture-recommendations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/scripture-recommendations')>(
    '@/lib/scripture-recommendations',
  )
  return {
    ...actual,
    getScriptureRecommendations: (...args: unknown[]) =>
      getScriptureRecommendations(...args),
  }
})

import { GET } from '@/app/api/songs/scripture-recommendations/route'
import { getServerSession } from 'next-auth'

describe('GET /api/songs/scripture-recommendations', () => {
  beforeEach(() => {
    resetPrismaMock()
    getScriptureRecommendations.mockReset()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await GET(
      new Request('http://localhost/api/songs/scripture-recommendations?reference=约翰3:16'),
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when reference is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })

    const res = await GET(new Request('http://localhost/api/songs/scripture-recommendations'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when reference is too short', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })

    const res = await GET(
      new Request('http://localhost/api/songs/scripture-recommendations?reference=约'),
    )
    expect(res.status).toBe(400)
  })

  it('returns recommendations', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    getScriptureRecommendations.mockResolvedValue({
      directMatches: [{ id: 's1', title: '神爱世人', artist: null, sheetMusic: null, reference: '约翰福音 3:16' }],
      historicalPicks: [],
    })

    const res = await GET(
      new Request('http://localhost/api/songs/scripture-recommendations?reference=约翰3:16'),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(getScriptureRecommendations).toHaveBeenCalledWith('约翰3:16')
    expect(body.directMatches).toHaveLength(1)
  })
})
