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

  it('POST returns share url for playlist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/share', {
        method: 'POST',
        body: { type: 'playlist', id: 'p1' },
      })
    )
    const { status, body } = await readJson<{ url: string; token: string }>(res)
    expect(status).toBe(200)
    expect(body.url).toContain('/share/playlist/p1')
    expect(body.token).toBeTruthy()
  })

  it('GET returns 400 when params missing', async () => {
    const res = await GET(jsonRequest('http://localhost/api/share?type=song'))
    expect((await readJson(res)).status).toBe(400)
  })

  it('GET returns song data with tags', async () => {
    mockPrisma.song.findUnique.mockResolvedValue({
      id: 's1',
      title: '神掌权',
      lyrics: '歌词',
      sheetMusic: '/uploads/sheets/a.pdf',
      audioFile: '/uploads/audio/a.mp3',
      tags: [],
      meetings: [],
    })
    const res = await GET(
      jsonRequest('http://localhost/api/share?type=song&id=s1&token=abc')
    )
    const { status, body } = await readJson<{
      title: string
      lyrics: string
      sheetMusic: string
      audioFile: string
    }>(res)
    expect(status).toBe(200)
    expect(body.title).toBe('神掌权')
    expect(body.lyrics).toBe('歌词')
    expect(body.sheetMusic).toBeTruthy()
    expect(body.audioFile).toBeTruthy()
  })

  it('GET returns playlist with full song fields', async () => {
    mockPrisma.playlist.findUnique.mockResolvedValue({
      id: 'p1',
      title: '主日歌单',
      songs: [
        {
          order: 1,
          song: {
            id: 's1',
            title: '神掌权',
            lyrics: '完整歌词',
            sheetMusic: '/uploads/sheets/a.pdf',
            audioFile: '/uploads/audio/a.mp3',
            key: 'G',
            tags: [{ tag: { name: '敬拜赞美', kind: 'TYPE' } }],
          },
        },
      ],
    })

    const res = await GET(
      jsonRequest('http://localhost/api/share?type=playlist&id=p1&token=abc')
    )
    const { status, body } = await readJson<{
      title: string
      songs: Array<{
        song: {
          lyrics: string
          sheetMusic: string
          audioFile: string
        }
      }>
    }>(res)

    expect(status).toBe(200)
    expect(body.title).toBe('主日歌单')
    expect(body.songs[0].song.lyrics).toBe('完整歌词')
    expect(body.songs[0].song.sheetMusic).toBeTruthy()
    expect(body.songs[0].song.audioFile).toBeTruthy()
  })

  it('GET returns 400 for unknown type', async () => {
    const res = await GET(
      jsonRequest('http://localhost/api/share?type=other&id=x&token=abc')
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('GET returns sheets share with full song fields', async () => {
    mockPrisma.sheetsShare.findUnique.mockResolvedValue({
      id: 'sh1',
      theme: 'Easter',
      scripture: 'John 3:16',
      arrangement: 'Opening fast → closing standing',
      createdBy: { id: 'u1', name: 'Leader' },
      songs: [
        {
          order: 1,
          song: {
            id: 's1',
            title: 'Amazing Grace',
            lyrics: '歌词',
            sheetMusic: '/uploads/sheets/a.pdf',
            sheetMusicPages: ['/uploads/sheets/a.pdf'],
            audioFile: '/uploads/audio/a.mp3',
            tags: [],
            scriptures: [],
          },
        },
      ],
    })

    const res = await GET(
      jsonRequest('http://localhost/api/share?type=sheets&id=sh1&token=abc')
    )
    const { status, body } = await readJson<{
      theme: string
      arrangement: string
      songs: Array<{
        song: {
          title: string
          audioFile: string
          sheetMusic: string
        }
      }>
    }>(res)

    expect(status).toBe(200)
    expect(body.theme).toBe('Easter')
    expect(body.arrangement).toBe('Opening fast → closing standing')
    expect(body.songs[0].song.title).toBe('Amazing Grace')
    expect(body.songs[0].song.audioFile).toBeTruthy()
    expect(body.songs[0].song.sheetMusic).toBeTruthy()
  })
})
