import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/playlists/[id]/songs/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 'p1' }) }

describe('POST /api/playlists/[id]/songs', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 403 for MEMBER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'MEMBER' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )

    expect((await readJson(res)).status).toBe(403)
  })

  it('returns 400 when songId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({ createdById: 'u1' })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: {},
      }),
      params
    )

    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toBe('songId 为必填项')
    expect(mockPrisma.playlistSong.create).not.toHaveBeenCalled()
  })

  it('returns 404 when playlist is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue(null)

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )

    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(404)
    expect(body.error).toBe('歌单不存在')
    expect(mockPrisma.playlistSong.create).not.toHaveBeenCalled()
  })

  it('appends song at end for owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique
      .mockResolvedValueOnce({ createdById: 'u1' })
      .mockResolvedValueOnce({
        id: 'p1',
        title: '主日',
        songs: [{ order: 3, song: { id: 's1' } }],
      })
    mockPrisma.playlistSong.findUnique.mockResolvedValue(null)
    mockPrisma.playlistSong.findFirst.mockResolvedValue({ order: 2 })
    mockPrisma.playlistSong.create.mockResolvedValue({
      playlistId: 'p1',
      songId: 's1',
      order: 3,
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )

    const { status } = await readJson(res)
    expect(status).toBe(200)
    expect(mockPrisma.playlistSong.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { playlistId: 'p1', songId: 's1', order: 3 },
      })
    )
  })

  it('is idempotent when song already in playlist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique
      .mockResolvedValueOnce({ createdById: 'u1' })
      .mockResolvedValueOnce({
        id: 'p1',
        title: '主日',
        songs: [{ order: 1, song: { id: 's1' } }],
      })
    mockPrisma.playlistSong.findUnique.mockResolvedValue({
      playlistId: 'p1',
      songId: 's1',
      order: 1,
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists/p1/songs', {
        method: 'POST',
        body: { songId: 's1' },
      }),
      params
    )

    expect((await readJson(res)).status).toBe(200)
    expect(mockPrisma.playlistSong.create).not.toHaveBeenCalled()
  })
})
