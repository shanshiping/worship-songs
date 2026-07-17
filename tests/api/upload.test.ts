import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readJson } from '../helpers/request'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/upload/route'
import { getServerSession } from 'next-auth'

describe('/api/upload', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const form = new FormData()
    form.append('file', new File(['x'], 'song.mp3'))
    const res = await POST(
      new Request('http://localhost/api/upload', { method: 'POST', body: form })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('parses title from filename', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const form = new FormData()
    form.append('file', new File(['x'], '01-Amazing_Grace.mp3', { type: 'audio/mpeg' }))
    const res = await POST(
      new Request('http://localhost/api/upload', { method: 'POST', body: form })
    )
    const { status, body } = await readJson<{ title: string }>(res)
    expect(status).toBe(200)
    expect(body.title).toContain('Amazing')
  })
})
