import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/share/route'
import { getServerSession } from 'next-auth'

describe('/api/share', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('POST returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/share', {
        method: 'POST',
        body: { type: 'song', id: 's1' },
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('POST returns share url', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/share', {
        method: 'POST',
        body: { type: 'song', id: 's1' },
      })
    )
    const { status, body } = await readJson<{ url: string; token: string }>(res)
    expect(status).toBe(200)
    expect(body.url).toContain('/share/song/s1')
    expect(body.token).toBeTruthy()
  })

  it('GET returns 400 when params missing', async () => {
    const res = await GET(jsonRequest('http://localhost/api/share?type=song'))
    expect((await readJson(res)).status).toBe(400)
  })

  it('GET returns song data', async () => {
    mockPrisma.song.findUnique.mockResolvedValue({
      id: 's1',
      title: '神掌权',
      category: { name: '其他' },
      meetings: [],
    })
    const res = await GET(
      jsonRequest('http://localhost/api/share?type=song&id=s1&token=abc')
    )
    const { status, body } = await readJson<{ title: string }>(res)
    expect(status).toBe(200)
    expect(body.title).toBe('神掌权')
  })

  it('GET returns 400 for unknown type', async () => {
    const res = await GET(
      jsonRequest('http://localhost/api/share?type=other&id=x&token=abc')
    )
    expect((await readJson(res)).status).toBe(400)
  })
})
