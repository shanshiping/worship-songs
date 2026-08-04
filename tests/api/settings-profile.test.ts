import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { PUT } from '@/app/api/settings/profile/route'
import { getServerSession } from 'next-auth'

describe('/api/settings/profile', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await PUT(
      jsonRequest('http://localhost/api/settings/profile', {
        method: 'PUT',
        body: { name: 'A', email: 'a@b.com' },
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('updates profile', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', email: 'old@b.com' },
    })
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue({
      id: 'u1',
      name: 'New',
      email: 'new@b.com',
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/settings/profile', {
        method: 'PUT',
        body: { name: 'New', email: 'new@b.com' },
      })
    )
    expect((await readJson(res)).status).toBe(200)
  })
})
