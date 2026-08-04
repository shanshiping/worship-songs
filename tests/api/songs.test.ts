import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/songs/route'
import { getServerSession } from 'next-auth'

describe('/api/songs', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns paginated songs', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's1', title: 'Song', category: { name: 'A' }, _count: { meetings: 0 } },
    ])
    mockPrisma.song.count.mockResolvedValue(1)

    const res = await GET(jsonRequest('http://localhost/api/songs?page=1&limit=20'))
    const { status, body } = await readJson<{
      songs: unknown[]
      pagination: { total: number }
    }>(res)

    expect(status).toBe(200)
    expect(body.songs).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('POST returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: 'T', categoryId: 'c1' },
      })
    )
    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(401)
    expect(body.error).toBe('请先登录')
  })

  it('POST returns 400 when title or category missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: 'T' },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(400)
  })

  it('POST creates song when authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.create.mockResolvedValue({
      id: 's1',
      title: '神掌权',
      categoryId: 'c1',
      category: { id: 'c1', name: '其他' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: '神掌权', categoryId: 'c1' },
      })
    )
    const { status, body } = await readJson<{ id: string; title: string }>(res)
    expect(status).toBe(201)
    expect(body.title).toBe('神掌权')
    expect(mockPrisma.song.create).toHaveBeenCalled()
  })
})
