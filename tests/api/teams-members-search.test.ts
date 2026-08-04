import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET } from '@/app/api/teams/[id]/members/search/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 't1' }) }

describe('/api/teams/[id]/members/search', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost?q=alice'), params)
    expect((await readJson(res)).status).toBe(401)
  })

  it('returns 403 for non-admin member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost?q=alice'), params)
    expect((await readJson(res)).status).toBe(403)
  })

  it('returns matching users excluding existing members', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'tm1', role: 'OWNER' })
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId: 'u1' }])
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u2', name: 'Alice', email: 'alice@example.com', avatar: null },
    ])

    const { status, body } = await readJson<unknown[]>(
      await GET(new Request('http://localhost?q=alice'), params)
    )

    expect(status).toBe(200)
    expect(body).toHaveLength(1)
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['u1'] },
        }),
      })
    )
  })

  it('returns empty array for blank query', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const { status, body } = await readJson<unknown[]>(
      await GET(new Request('http://localhost?q='), params)
    )
    expect(status).toBe(200)
    expect(body).toEqual([])
    expect(mockPrisma.teamMember.findFirst).not.toHaveBeenCalled()
  })
})
