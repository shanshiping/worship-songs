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
  tryExtractLyricsFromSheetPath: vi.fn(),
}))

import { POST } from '@/app/api/songs/[id]/extract-lyrics/route'
import { getServerSession } from 'next-auth'
import { tryExtractLyricsFromSheetPath } from '@/lib/sheet-lyrics'

const params = { params: Promise.resolve({ id: 'song-1' }) }

describe('/api/songs/[id]/extract-lyrics', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
    vi.mocked(tryExtractLyricsFromSheetPath).mockReset()
    delete process.env.GEMINI_API_KEY
    delete process.env.LYRICS_OCR_PROVIDER
    delete process.env.AI_API_KEY
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/songs/song-1/extract-lyrics', {
        method: 'POST',
      }),
      params,
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('returns 503 without OCR config', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/songs/song-1/extract-lyrics', {
        method: 'POST',
      }),
      params,
    )
    expect((await readJson(res)).status).toBe(503)
  })

  it('extracts and saves lyrics', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.song.findUnique.mockResolvedValue({
      id: 'song-1',
      sheetMusic: '/uploads/sheets/a.png',
    })
    vi.mocked(tryExtractLyricsFromSheetPath).mockResolvedValue('哈利路亚')
    mockPrisma.song.update.mockResolvedValue({
      id: 'song-1',
      lyrics: '哈利路亚',
    })

    const res = await POST(
      jsonRequest('http://localhost/api/songs/song-1/extract-lyrics', {
        method: 'POST',
      }),
      params,
    )
    const { status, body } = await readJson<{ lyrics: string }>(res)
    expect(status).toBe(200)
    expect(body.lyrics).toBe('哈利路亚')
    expect(mockPrisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'song-1' },
        data: { lyrics: '哈利路亚' },
      }),
    )
  })
})
