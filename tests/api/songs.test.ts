import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/sheet-lyrics', () => ({
  resolveLyricsWithAutoExtract: vi.fn(async (_sheet, lyrics) => {
    if (typeof lyrics === 'string' && lyrics.trim()) return lyrics.trim()
    return '自动识别歌词'
  }),
}))

import { GET, POST } from '@/app/api/songs/route'
import { getServerSession } from 'next-auth'
import { resolveLyricsWithAutoExtract } from '@/lib/sheet-lyrics'

describe('/api/songs', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
    vi.mocked(resolveLyricsWithAutoExtract).mockClear()
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
                {
                  scriptures: {
                    some: {
                      reference: { contains: 'Praise', mode: 'insensitive' },
                    },
                  },
                },
              ],
            },
            { lyrics: { contains: 'holy', mode: 'insensitive' } },
          ],
        },
      })
    )
  })

  it('GET search also matches scripture reference', async () => {
    mockPrisma.song.findMany.mockResolvedValue([])
    mockPrisma.song.count.mockResolvedValue(0)

    await GET(jsonRequest('http://localhost/api/songs?search=诗篇'))

    const call = mockPrisma.song.findMany.mock.calls[0]?.[0] as {
      where: { OR?: unknown[]; AND?: Array<{ OR?: unknown[] }> }
    }
    const or =
      call.where.OR ??
      call.where.AND?.find((clause) => Array.isArray(clause.OR))?.OR
    expect(or).toEqual(
      expect.arrayContaining([
        {
          scriptures: {
            some: { reference: { contains: '诗篇', mode: 'insensitive' } },
          },
        },
      ])
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
          lyrics: '自动识别歌词',
          tags: { create: [{ tagId: 't1' }] },
        }),
      })
    )
  })

  it('POST keeps provided lyrics over auto extract', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.create.mockResolvedValue({ id: 's1', title: 'T', tags: [] })

    await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: {
          title: 'T',
          sheetMusic: '/uploads/sheets/a.pdf',
          lyrics: '手动歌词',
        },
      }),
    )

    expect(resolveLyricsWithAutoExtract).toHaveBeenCalledWith(
      '/uploads/sheets/a.pdf',
      '手动歌词',
    )
    expect(mockPrisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lyrics: '手动歌词' }),
      }),
    )
  })

  it('POST creates scriptures', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.create.mockResolvedValue({
      id: 's1',
      title: 'T',
      tags: [],
      scriptures: [],
    })

    await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: {
          title: 'T',
          scriptures: [
            { reference: '约翰福音 3:16', text: '神爱世人' },
            { reference: '诗篇 23:1' },
          ],
        },
      })
    )

    expect(mockPrisma.song.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scriptures: {
            create: [
              { reference: '约翰福音 3:16', text: '神爱世人', order: 0 },
              { reference: '诗篇 23:1', text: null, order: 1 },
            ],
          },
        }),
      })
    )
  })

  it('POST returns 400 for blank scripture reference', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/songs', {
        method: 'POST',
        body: { title: 'T', scriptures: [{ reference: '  ' }] },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })
})
