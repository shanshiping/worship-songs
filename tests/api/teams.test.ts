import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/teams/route'
import { getServerSession } from 'next-auth'

describe('/api/teams', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await readJson(await GET())).status).toBe(401)
  })

  it('GET returns teams', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.findMany.mockResolvedValue([{ id: 't1', name: 'Team' }])
    const { status, body } = await readJson<unknown[]>(await GET())
    expect(status).toBe(200)
    expect(body).toHaveLength(1)
  })

  it('POST creates team with same shape as GET', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.create.mockResolvedValue({
      id: 't1',
      name: 'New',
      members: [{ id: 'm1', role: 'OWNER', user: { id: 'u1', name: 'User', email: 'u@example.com', avatar: null } }],
      _count: { members: 1, messages: 0 },
    })
    const { status, body } = await readJson<{ _count: { members: number; messages: number } }>(
      await POST(
        jsonRequest('http://localhost/api/teams', {
          method: 'POST',
          body: { name: 'New' },
        })
      )
    )
    expect(status).toBe(201)
    expect(body._count).toEqual({ members: 1, messages: 0 })
    expect(mockPrisma.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: { select: { members: true, messages: true } },
        }),
      })
    )
  })
})
