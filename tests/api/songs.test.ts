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
      { id: 's1', title: 'Song', tags: [], _count: { meetings: 0 } },
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

  it('GET filters by tagIds with AND', async () => {
    mockPrisma.song.findMany.mockResolvedValue([])
    mockPrisma.song.count.mockResolvedValue(0)

    await GET(
      jsonRequest('http://localhost/api/songs?tagIds=t1&tagIds=t2')
    )

    expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tags: { some: { tagId: 't1' } } },
            { tags: { some: { tagId: 't2' } } },
          ],
        },
      })
    )
  })

  it('GET filters by lyricsSearch', async () => {
    mockPrisma.song.findMany.mockResolvedValue([])
    mockPrisma.song.count.mockResolvedValue(0)

    await GET(jsonRequest('http://localhost/api/songs?lyricsSearch=哈利路亚'))

    expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          lyrics: { contains: '哈利路亚', mode: 'insensitive' },
        },
      })
    )
  })

  it('GET combines search and lyricsSearch with AND', async () => {
    mockPrisma.song.findMany.mockResolvedValue([])
    mockPrisma.song.count.mockResolvedValue(0)

    await GET(
      jsonRequest('http://localhost/api/songs?search=Praise&lyricsSearch=holy')
    )

    expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { title: { contains: 'Praise', mode: 'insensitive' } },
                { artist: { contains: 'Praise', mode: 'insensitive' } },
              ],
            },
            { lyrics: { contains: 'holy', mode: 'insensitive' } },
          ],
        },
      })
    )
  })

  it('POST saves lyricsLrc', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.create.mockResolvedValue({
      id: 's1',
      title: 'T',
      tags: [],
    })

    await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: 'T', lyricsLrc: '[00:01.00]Hi' },
      })
    )

    expect(mockPrisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lyricsLrc: '[00:01.00]Hi' }),
      })
    )
  })

  it('POST returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: 'T' },
      })
    )
    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(401)
    expect(body.error).toBe('请先登录')
  })

  it('POST returns 400 when title missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { tagIds: ['t1'] },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(400)
  })

  it('POST creates song with tags when authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.create.mockResolvedValue({
      id: 's1',
      title: '神掌权',
      tags: [{ tag: { id: 't1', name: '敬拜赞美', kind: 'TYPE' } }],
    })

    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: '神掌权', tagIds: ['t1'], sheetMusic: '/uploads/sheets/a.pdf' },
      })
    )
    const { status, body } = await readJson<{ id: string; title: string }>(res)
    expect(status).toBe(201)
    expect(body.title).toBe('神掌权')
    expect(mockPrisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '神掌权',
          uploadedById: 'u1',
          sheetUploadedById: 'u1',
          tags: { create: [{ tagId: 't1' }] },
        }),
      })
    )
  })
})
