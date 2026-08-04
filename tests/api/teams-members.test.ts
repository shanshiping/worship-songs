import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/teams/[id]/members/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 't1' }) }

describe('/api/teams/[id]/members', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/teams/t1/members', {
        method: 'POST',
        body: { email: 'a@b.com' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('adds member when admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst
      .mockResolvedValueOnce({ id: 'tm1', role: 'OWNER' })
      .mockResolvedValueOnce(null)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'a@b.com',
    })
    mockPrisma.teamMember.create.mockResolvedValue({
      id: 'tm2',
      user: { id: 'u2', email: 'a@b.com' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/teams/t1/members', {
        method: 'POST',
        body: { email: 'a@b.com' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(201)
  })

  it('adds member by userId', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst
      .mockResolvedValueOnce({ id: 'tm1', role: 'ADMIN' })
      .mockResolvedValueOnce(null)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      name: 'Alice',
      email: 'a@b.com',
    })
    mockPrisma.teamMember.create.mockResolvedValue({
      id: 'tm2',
      user: { id: 'u2', name: 'Alice', email: 'a@b.com' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/teams/t1/members', {
        method: 'POST',
        body: { userId: 'u2' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(201)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u2' } })
  })
})
