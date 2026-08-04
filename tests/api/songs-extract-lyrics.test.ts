import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/gemini-lyrics', () => ({
  extractLyricsFromSheet: vi.fn(),
}))
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

import { POST } from '@/app/api/songs/extract-lyrics/route'
import { getServerSession } from 'next-auth'
import { extractLyricsFromSheet } from '@/lib/gemini-lyrics'
import { readFile } from 'fs/promises'

describe('/api/songs/extract-lyrics', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(extractLyricsFromSheet).mockReset()
    vi.mocked(readFile).mockReset()
    delete process.env.GEMINI_API_KEY
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/songs/extract-lyrics', {
        method: 'POST',
        body: { path: '/uploads/sheets/a.pdf' },
      })
    )
    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(401)
    expect(body.error).toBe('请先登录')
  })

  it('returns 503 without GEMINI_API_KEY', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/songs/extract-lyrics', {
        method: 'POST',
        body: { path: '/uploads/sheets/a.pdf' },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(503)
  })

  it('returns 400 for path traversal', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    process.env.GEMINI_API_KEY = 'test-key'
    const res = await POST(
      jsonRequest('http://localhost/api/songs/extract-lyrics', {
        method: 'POST',
        body: { path: '/uploads/sheets/../../etc/passwd' },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(400)
  })

  it('returns lyrics without writing to DB', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(readFile).mockResolvedValue(Buffer.from('%PDF'))
    vi.mocked(extractLyricsFromSheet).mockResolvedValue('哈利路亚\n赞美主')

    const res = await POST(
      jsonRequest('http://localhost/api/songs/extract-lyrics', {
        method: 'POST',
        body: { path: '/uploads/sheets/a.pdf' },
      })
    )
    const { status, body } = await readJson<{ lyrics: string }>(res)
    expect(status).toBe(200)
    expect(body.lyrics).toBe('哈利路亚\n赞美主')
    expect(extractLyricsFromSheet).toHaveBeenCalled()
  })
})
