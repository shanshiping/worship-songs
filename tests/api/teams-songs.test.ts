import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST, DELETE } from '@/app/api/teams/[id]/songs/route'
import { getServerSession } from 'next-auth'

const params = Promise.resolve({ id: 't1' })

describe('/api/teams/[id]/songs', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await readJson(await GET(new Request('http://localhost'), { params }))).status).toBe(401)
  })

  it('GET returns 403 for non-member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)
    expect((await readJson(await GET(new Request('http://localhost'), { params }))).status).toBe(403)
  })

  it('GET returns shared songs for member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })
    mockPrisma.teamSong.findMany.mockResolvedValue([
      { id: 'ts1', song: { id: 's1', title: 'Song' } },
    ])
    const { status, body } = await readJson<unknown[]>(
      await GET(new Request('http://localhost'), { params })
    )
    expect(status).toBe(200)
    expect(body).toHaveLength(1)
  })

  it('POST shares song for member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })
    mockPrisma.song.findUnique.mockResolvedValue({ id: 's1', title: 'Song' })
    mockPrisma.teamSong.findUnique.mockResolvedValue(null)
    mockPrisma.teamSong.create.mockResolvedValue({
      id: 'ts1',
      teamId: 't1',
      songId: 's1',
      sharedById: 'u1',
    })
    mockPrisma.team.update.mockResolvedValue({ id: 't1' })

    const { status } = await readJson(
      await POST(
        jsonRequest('http://localhost/api/teams/t1/songs', {
          method: 'POST',
          body: { songId: 's1' },
        }),
        { params }
      )
    )
    expect(status).toBe(201)
    expect(mockPrisma.teamSong.create).toHaveBeenCalled()
  })

  it('POST returns existing share idempotently', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })
    mockPrisma.song.findUnique.mockResolvedValue({ id: 's1', title: 'Song' })
    mockPrisma.teamSong.findUnique
      .mockResolvedValueOnce({ id: 'ts1', teamId: 't1', songId: 's1' })
      .mockResolvedValueOnce({ id: 'ts1', teamId: 't1', songId: 's1' })

    const { status } = await readJson(
      await POST(
        jsonRequest('http://localhost/api/teams/t1/songs', {
          method: 'POST',
          body: { songId: 's1' },
        }),
        { params }
      )
    )
    expect(status).toBe(200)
    expect(mockPrisma.teamSong.create).not.toHaveBeenCalled()
  })

  it('DELETE returns 403 for non-sharer member', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u2' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'm2', role: 'MEMBER' })
    mockPrisma.teamSong.findUnique.mockResolvedValue({
      id: 'ts1',
      sharedById: 'u1',
    })

    const { status } = await readJson(
      await DELETE(
        new Request('http://localhost/api/teams/t1/songs?songId=s1'),
        { params }
      )
    )
    expect(status).toBe(403)
  })

  it('DELETE allows owner to remove shared song', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u2' } })
    mockPrisma.teamMember.findFirst.mockResolvedValue({ id: 'm2', role: 'OWNER' })
    mockPrisma.teamSong.findUnique.mockResolvedValue({
      id: 'ts1',
      sharedById: 'u1',
    })
    mockPrisma.teamSong.delete.mockResolvedValue({ id: 'ts1' })

    const { status } = await readJson(
      await DELETE(
        new Request('http://localhost/api/teams/t1/songs?songId=s1'),
        { params }
      )
    )
    expect(status).toBe(200)
    expect(mockPrisma.teamSong.delete).toHaveBeenCalled()
  })
})
