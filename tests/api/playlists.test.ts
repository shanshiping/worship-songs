import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/playlists/route'
import { DELETE, PUT } from '@/app/api/playlists/[id]/route'
import { getServerSession } from 'next-auth'

const params = { params: Promise.resolve({ id: 'p1' }) }

describe('/api/playlists', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns playlists', async () => {
    mockPrisma.playlist.findMany.mockResolvedValue([
      { id: 'p1', title: '主日', songs: [], _count: { songs: 0 } },
    ])
    mockPrisma.playlist.count.mockResolvedValue(1)

    const res = await GET(jsonRequest('http://localhost/api/playlists'))
    const { status, body } = await readJson<{
      playlists: unknown[]
      pagination: { total: number }
    }>(res)

    expect(status).toBe(200)
    expect(body.playlists).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('POST returns 403 for MEMBER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'MEMBER' },
    })
    const res = await POST(
      jsonRequest('http://localhost/api/playlists', {
        method: 'POST',
        body: { title: '主日' },
      })
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('POST creates playlist for LEADER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.create.mockResolvedValue({
      id: 'p1',
      title: '主日',
      songs: [],
    })

    const res = await POST(
      jsonRequest('http://localhost/api/playlists', {
        method: 'POST',
        body: { title: '主日', songIds: ['s1'] },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(201)
    expect(mockPrisma.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '主日',
          createdById: 'u1',
          songs: { create: [{ songId: 's1', order: 1 }] },
        }),
      })
    )
  })
})

describe('/api/playlists/[id]', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('PUT returns 403 when non-owner LEADER', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u2', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({
      createdById: 'u1',
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/playlists/p1', {
        method: 'PUT',
        body: { title: '新标题', songIds: [] },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })

  it('PUT allows owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({
      createdById: 'u1',
    })
    mockPrisma.playlistSong.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.playlist.update.mockResolvedValue({
      id: 'p1',
      title: '新标题',
      songs: [],
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/playlists/p1', {
        method: 'PUT',
        body: { title: '新标题', songIds: ['s1'] },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('PUT allows ADMIN for any playlist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'admin', role: 'ADMIN' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({
      createdById: 'u1',
    })
    mockPrisma.playlistSong.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.playlist.update.mockResolvedValue({
      id: 'p1',
      title: '管理员改',
      songs: [],
    })

    const res = await PUT(
      jsonRequest('http://localhost/api/playlists/p1', {
        method: 'PUT',
        body: { title: '管理员改', songIds: [] },
      }),
      params
    )
    expect((await readJson(res)).status).toBe(200)
  })

  it('DELETE returns 403 for non-owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u2', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({
      createdById: 'u1',
    })

    const res = await DELETE(
      jsonRequest('http://localhost/api/playlists/p1', { method: 'DELETE' }),
      params
    )
    expect((await readJson(res)).status).toBe(403)
  })
})
