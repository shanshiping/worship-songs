import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/tags/route'
import { DELETE, PUT } from '@/app/api/tags/[id]/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 't1' }) }

describe('/api/tags', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns all tags', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 't1', name: '敬拜赞美', kind: 'TYPE' },
      { id: 't2', name: '活泼', kind: 'STYLE' },
    ])

    const res = await GET(jsonRequest('http://localhost/api/tags'))
    const { status, body } = await readJson<{ tags: unknown[] }>(res)

    expect(status).toBe(200)
    expect(body.tags).toHaveLength(2)
  })

  it('POST returns 403 for MEMBER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'MEMBER' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/tags', {
        method: 'POST',
        body: { name: '婚礼诗歌', kind: 'TYPE' },
      })
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('POST creates tag for LEADER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.tag.findUnique.mockResolvedValue(null)
    mockPrisma.tag.create.mockResolvedValue({
      id: 't3',
      name: '婚礼诗歌',
      kind: 'TYPE',
    })

    const res = await POST(
      jsonRequest('http://localhost/api/tags', {
        method: 'POST',
        body: { name: '婚礼诗歌', kind: 'TYPE' },
      })
    )
    const { status, body } = await readJson<{ tag: { name: string } }>(res)

    expect(status).toBe(201)
    expect(body.tag.name).toBe('婚礼诗歌')
  })

  it('POST returns 409 for duplicate name', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN' },
    })
    mockPrisma.tag.findUnique.mockResolvedValue({
      id: 't1',
      name: '敬拜赞美',
      kind: 'TYPE',
    })

    const res = await POST(
      jsonRequest('http://localhost/api/tags', {
        method: 'POST',
        body: { name: '敬拜赞美', kind: 'TYPE' },
      })
    )
    expect((await readJson(res)).status).toBe(409)
  })
})

describe('/api/tags/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('PUT renames tag for LEADER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.tag.findUnique
      .mockResolvedValueOnce({ id: 't1', name: '敬拜赞美', kind: 'TYPE' })
      .mockResolvedValueOnce(null)
    mockPrisma.tag.update.mockResolvedValue({
      id: 't1',
      name: '主日敬拜',
      kind: 'TYPE',
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/tags/t1', {
        method: 'PUT',
        body: { name: '主日敬拜' },
      }),
      params
    )
    const { status, body } = await readJson<{ tag: { name: string } }>(res)

    expect(status).toBe(200)
    expect(body.tag.name).toBe('主日敬拜')
  })

  it('DELETE returns 403 for LEADER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })

    const res = await DELETE(
      jsonRequest('http://localhost/api/tags/t1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('DELETE removes tag for ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN' },
    })
    mockPrisma.tag.findUnique.mockResolvedValue({
      id: 't1',
      name: '敬拜赞美',
      kind: 'TYPE',
    })
    mockPrisma.tag.delete.mockResolvedValue({ id: 't1' })

    const res = await DELETE(
      jsonRequest('http://localhost/api/tags/t1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
    expect(mockPrisma.tag.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
  })
})
