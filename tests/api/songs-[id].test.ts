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

  it('GET returns song with meetings', async () => {
    mockPrisma.song.findUnique.mockResolvedValue({
      id: 'song-1',
      title: '神掌权',
      category: { id: 'c1', name: '其他' },
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

  it('PUT updates via category.connect', async () => {
    mockPrisma.song.update.mockResolvedValue({
      id: 'song-1',
      title: '神掌权',
      category: { id: 'c2', name: '敬拜' },
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/songs/song-1', {
        method: 'PUT',
        body: {
          title: '神掌权',
          categoryId: 'c2',
          artist: '',
          mvUrl: '',
        },
      }),
      params
    )
    const { status } = await readJson(res)
    expect(status).toBe(200)
    expect(mockPrisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'song-1' },
        data: expect.objectContaining({
          category: { connect: { id: 'c2' } },
        }),
      })
    )
    const updateArg = mockPrisma.song.update.mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(updateArg.data).not.toHaveProperty('categoryId')
  })

  it('DELETE removes meeting links then song', async () => {
    mockPrisma.meetingSong.deleteMany.mockResolvedValue({ count: 1 })
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
