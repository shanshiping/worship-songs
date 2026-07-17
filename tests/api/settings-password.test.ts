import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}))

import { PUT } from '@/app/api/settings/password/route'
import { getServerSession } from 'next-auth'
import { compare, hash } from 'bcryptjs'

describe('/api/settings/password', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
    vi.mocked(compare).mockReset()
    vi.mocked(hash).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await PUT(
      jsonRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: { currentPassword: 'old', newPassword: 'newpass' },
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('updates password when current is valid', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      password: 'hashed',
    })
    vi.mocked(compare).mockResolvedValue(true as never)
    vi.mocked(hash).mockResolvedValue('new-hashed' as never)
    mockPrisma.user.update.mockResolvedValue({ id: 'u1' })

    const res = await PUT(
      jsonRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: { currentPassword: 'old', newPassword: 'newpass' },
      })
    )
    expect((await readJson(res)).status).toBe(200)
  })
})
