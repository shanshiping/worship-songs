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
vi.mock('@/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/permissions')>()
  return actual
})

import { DELETE, GET, PUT } from '@/app/api/meetings/[id]/route'

const params = { params: Promise.resolve({ id: 'm1' }) }

describe('/api/meetings/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
    requirePermission.mockReset()
    requirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' })
  })

  it('GET returns 404 when missing', async () => {
    mockPrisma.meeting.findUnique.mockResolvedValue(null)
    const res = await GET(jsonRequest('http://localhost/api/meetings/m1'), params)
    expect((await readJson(res)).status).toBe(404)
  })

  it('GET returns meeting', async () => {
    mockPrisma.meeting.findUnique.mockResolvedValue({
      id: 'm1',
      date: new Date('2026-01-01'),
      songs: [],
    })
    const res = await GET(jsonRequest('http://localhost/api/meetings/m1'), params)
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT updates after permission check', async () => {
    mockPrisma.meetingSong.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.meeting.update.mockResolvedValue({
      id: 'm1',
      songs: [],
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/meetings/m1', {
        method: 'PUT',
        body: { theme: '新主题', songIds: ['s1'] },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
    expect(requirePermission).toHaveBeenCalled()
  })

  it('DELETE removes meeting', async () => {
    mockPrisma.meeting.delete.mockResolvedValue({ id: 'm1' })
    const res = await DELETE(
      jsonRequest('http://localhost/api/meetings/m1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT returns 401 when requirePermission throws login error', async () => {
    requirePermission.mockRejectedValue(new Error('请先登录'))
    const res = await PUT(
      jsonRequest('http://localhost/api/meetings/m1', {
        method: 'PUT',
        body: {},
      }),
      params
    )
    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(401)
    expect(body.error).toBe('请先登录')
  })
})
