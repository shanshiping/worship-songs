import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { DELETE, GET, PUT } from '@/app/api/teams/[id]/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 't1' }) }

describe('/api/teams/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns 403 for non-member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: 't1',
      members: [{ userId: 'other' }],
      owner: {},
      messages: [],
    })
    const res = await GET(jsonRequest('http://localhost/api/teams/t1'), params)
    expect((await readJson(res)).status).toBe(403)
  })

  it('GET returns team for member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: 't1',
      members: [{ userId: 'u1' }],
      owner: {},
      messages: [],
    })
    const res = await GET(jsonRequest('http://localhost/api/teams/t1'), params)
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT requires owner/admin membership', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)
    const res = await PUT(
      jsonRequest('http://localhost/api/teams/t1', {
        method: 'PUT',
        body: { name: 'X' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('DELETE only allows owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: 't1',
      ownerId: 'other',
    })
    const res = await DELETE(
      jsonRequest('http://localhost/api/teams/t1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })
})
