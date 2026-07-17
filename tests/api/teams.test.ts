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

  it('POST creates team', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.team.create.mockResolvedValue({ id: 't1', name: 'New' })
    const res = await POST(
      jsonRequest('http://localhost/api/teams', {
        method: 'POST',
        body: { name: 'New' },
      })
    )
    expect((await readJson(res)).status).toBe(201)
  })
})
