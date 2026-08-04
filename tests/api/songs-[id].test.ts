import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { DELETE, GET, PUT } from '@/app/api/songs/[id]/route'

const params = { params: Promise.resolve({ id: 'song-1' }) }

describe('/api/songs/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('GET returns 404 when missing', async () => {
    mockPrisma.song.findUnique.mockResolvedValue(null)
    const res = await GET(jsonRequest('http://localhost/api/songs/song-1'), params)
    const { status } = await readJson(res)
    expect(status).toBe(404)
  })

  it('GET returns song with meetings and tags', async () => {
    mockPrisma.song.findUnique.mockResolvedValue({
      id: 'song-1',
      title: '神掌权',
      tags: [{ tag: { id: 't1', name: '敬拜赞美', kind: 'TYPE' } }],
    })
    mockPrisma.meetingSong.findMany.mockResolvedValue([
      { meeting: { id: 'm1', date: new Date('2026-01-01') } },
    ])

    const res = await GET(jsonRequest('http://localhost/api/songs/song-1'), params)
    const { status, body } = await readJson<{ title: string; meetings: unknown[] }>(res)
    expect(status).toBe(200)
    expect(body.title).toBe('神掌权')
    expect(body.meetings).toHaveLength(1)
  })

  it('PUT syncs tags', async () => {
    mockPrisma.songTag.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.song.update.mockResolvedValue({
      id: 'song-1',
      title: '神掌权',
      tags: [{ tag: { id: 't2', name: '活泼', kind: 'STYLE' } }],
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/songs/song-1', {
        method: 'PUT',
        body: {
          title: '神掌权',
          tagIds: ['t2'],
          artist: '',
          mvUrl: '',
        },
      }),
      params
    )
    const { status } = await readJson(res)
    expect(status).toBe(200)
    expect(mockPrisma.songTag.deleteMany).toHaveBeenCalledWith({
      where: { songId: 'song-1' },
    })
    expect(mockPrisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'song-1' },
        data: expect.objectContaining({
          tags: { create: [{ tagId: 't2' }] },
        }),
      })
    )
  })

  it('DELETE removes links then song', async () => {
    mockPrisma.meetingSong.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.playlistSong.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.songTag.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.song.delete.mockResolvedValue({ id: 'song-1' })

    const res = await DELETE(
      jsonRequest('http://localhost/api/songs/song-1', { method: 'DELETE' }),
      params
    )
    const { status } = await readJson(res)
    expect(status).toBe(200)
    expect(mockPrisma.meetingSong.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.song.delete).toHaveBeenCalled()
  })
})
