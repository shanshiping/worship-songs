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

import { DELETE, PUT } from '@/app/api/categories/[id]/route'

const params = { params: Promise.resolve({ id: 'c1' }) }

describe('/api/categories/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
    requirePermission.mockReset()
    requirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' })
  })

  it('PUT updates name', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null)
    mockPrisma.category.update.mockResolvedValue({ id: 'c1', name: '新名' })
    const res = await PUT(
      jsonRequest('http://localhost/api/categories/c1', {
        method: 'PUT',
        body: { name: '新名' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT returns 400 when name empty', async () => {
    const res = await PUT(
      jsonRequest('http://localhost/api/categories/c1', {
        method: 'PUT',
        body: { name: '' },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('DELETE moves songs then deletes', async () => {
    mockPrisma.song.count.mockResolvedValue(2)
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'other', name: '其他' })
    mockPrisma.song.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.category.delete.mockResolvedValue({ id: 'c1' })

    const res = await DELETE(
      jsonRequest('http://localhost/api/categories/c1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
    expect(mockPrisma.song.updateMany).toHaveBeenCalled()
    expect(mockPrisma.category.delete).toHaveBeenCalled()
  })
})
