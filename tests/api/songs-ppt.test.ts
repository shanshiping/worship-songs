import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest } from '../helpers/request'

const requirePermission = vi.hoisted(() => vi.fn())
const buildLyricsPpt = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/server-permissions', () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}))
vi.mock('@/lib/ppt-lyrics', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ppt-lyrics')>('@/lib/ppt-lyrics')
  return {
    ...actual,
    buildLyricsPpt: (...args: unknown[]) => buildLyricsPpt(...args),
  }
})

import { POST } from '@/app/api/songs/ppt/route'

describe('/api/songs/ppt', () => {
  beforeEach(() => {
    resetPrismaMock()
    requirePermission.mockReset()
    buildLyricsPpt.mockReset()
    requirePermission.mockResolvedValue({ id: 'u1', role: 'LEADER' })
    buildLyricsPpt.mockResolvedValue(Buffer.from('pptx-data'))
  })

  it('returns 401 when not logged in', async () => {
    requirePermission.mockRejectedValue(new Error('请先登录'))

    const res = await POST(
      jsonRequest('http://localhost/api/songs/ppt', {
        method: 'POST',
        body: { songIds: ['s1'] },
      })
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when permission denied', async () => {
    requirePermission.mockRejectedValue(new Error('权限不足'))

    const res = await POST(
      jsonRequest('http://localhost/api/songs/ppt', {
        method: 'POST',
        body: { songIds: ['s1'] },
      })
    )

    expect(res.status).toBe(403)
  })

  it('returns 400 when songIds is empty', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/songs/ppt', {
        method: 'POST',
        body: { songIds: [] },
      })
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 when all songs lack lyrics', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: '无歌词歌',
        artist: null,
        lyricist: null,
        lyrics: null,
        lyricsLrc: null,
      },
    ])

    const res = await POST(
      jsonRequest('http://localhost/api/songs/ppt', {
        method: 'POST',
        body: { songIds: ['s1'] },
      })
    )

    expect(res.status).toBe(400)
  })

  it('returns pptx attachment for songs with lyrics', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: '神掌权',
        artist: '作者',
        lyricist: null,
        lyrics: '第一段\n行一\n行二',
        lyricsLrc: null,
      },
    ])

    const res = await POST(
      jsonRequest('http://localhost/api/songs/ppt', {
        method: 'POST',
        body: { songIds: ['s1'] },
      })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
    expect(res.headers.get('Content-Disposition')).toContain('worship-lyrics-')
    expect(buildLyricsPpt).toHaveBeenCalledOnce()
    const songsArg = buildLyricsPpt.mock.calls[0]?.[0] as Array<{ title: string; artist: string | null }>
    expect(songsArg).toHaveLength(1)
    expect(songsArg[0]?.title).toBe('神掌权')
    expect(songsArg[0]?.artist).toBe('作者')
    const body = Buffer.from(await res.arrayBuffer())
    expect(body.length).toBeGreaterThan(0)
  })
})
