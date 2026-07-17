import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/teams/[id]/messages/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 't1' }) }

describe('/api/teams/[id]/messages', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns 403 for non-member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)
    const res = await GET(
      jsonRequest('http://localhost/api/teams/t1/messages'),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('GET returns messages', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'tm1' })
    mockPrisma.message.findMany.mockResolvedValue([
      { id: 'msg1', content: 'hi', user: { id: 'u1', name: 'A' } },
    ])
    const res = await GET(
      jsonRequest('http://localhost/api/teams/t1/messages'),
      params
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('POST creates message', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'tm1' })
    mockPrisma.message.create.mockResolvedValue({
      id: 'msg1',
      content: 'hello',
      user: { id: 'u1' },
    })
    mockPrisma.team.update.mockResolvedValue({ id: 't1' })

    const res = await POST(
      jsonRequest('http://localhost/api/teams/t1/messages', {
        method: 'POST',
        body: { content: 'hello' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(201)
  })
})
