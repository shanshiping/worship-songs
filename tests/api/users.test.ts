import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

const requirePermission = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/server-permissions', () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}))

import { GET, PUT } from '@/app/api/users/route'

describe('/api/users', () => {
  beforeEach(() => {
    resetPrismaMock()
    requirePermission.mockReset()
    requirePermission.mockResolvedValue({ id: 'admin', role: 'SUPER_ADMIN' })
  })

  it('GET returns users', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'A', email: 'a@b.com', role: 'MEMBER' },
    ])
    const res = await GET()
    const { status, body } = await readJson<unknown[]>(res)
    expect(status).toBe(200)
    expect(body).toHaveLength(1)
  })

  it('PUT updates role', async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: 'u2',
      name: 'B',
      email: 'b@b.com',
      role: 'LEADER',
    })
    const res = await PUT(
      jsonRequest('http://localhost/api/users', {
        method: 'PUT',
        body: { userId: 'u2', role: 'LEADER' },
      })
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT returns 400 when changing own role', async () => {
    const res = await PUT(
      jsonRequest('http://localhost/api/users', {
        method: 'PUT',
        body: { userId: 'admin', role: 'MEMBER' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })
})
