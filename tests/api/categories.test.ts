import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/categories/route'
import { getServerSession } from 'next-auth'

describe('/api/categories', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns categories', async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      { id: 'c1', name: '其他', _count: { songs: 2 } },
    ])
    const res = await GET()
    const { status, body } = await readJson<unknown[]>(res)
    expect(status).toBe(200)
    expect(body).toHaveLength(1)
  })

  it('POST returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/categories', {
        method: 'POST',
        body: { name: '敬拜' },
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('POST returns 400 when name missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/categories', {
        method: 'POST',
        body: {},
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('POST returns 400 when category exists', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'c1', name: '敬拜' })
    const res = await POST(
      jsonRequest('http://localhost/api/categories', {
        method: 'POST',
        body: { name: '敬拜' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('POST creates category', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.category.findUnique.mockResolvedValue(null)
    mockPrisma.category.create.mockResolvedValue({ id: 'c2', name: '敬拜' })
    const res = await POST(
      jsonRequest('http://localhost/api/categories', {
        method: 'POST',
        body: { name: '敬拜' },
      })
    )
    expect((await readJson(res)).status).toBe(201)
  })
})
