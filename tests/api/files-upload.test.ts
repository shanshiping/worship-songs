import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readJson } from '../helpers/request'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

import { POST } from '@/app/api/files/upload/route'
import { getServerSession } from 'next-auth'

describe('/api/files/upload', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const form = new FormData()
    form.append('file', new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    form.append('type', 'sheet')
    const res = await POST(
      new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: form,
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('rejects unsupported type', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const form = new FormData()
    form.append('file', new File(['x'], 'a.txt', { type: 'text/plain' }))
    form.append('type', 'sheet')
    const res = await POST(
      new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: form,
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('uploads valid sheet file', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const form = new FormData()
    form.append(
      'file',
      new File(['pdf'], 'sheet.pdf', { type: 'application/pdf' })
    )
    form.append('type', 'sheet')
    const res = await POST(
      new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: form,
      })
    )
    const { status, body } = await readJson<{ path: string }>(res)
    expect(status).toBe(200)
    expect(body.path).toContain('/uploads/sheets/test-uuid.pdf')
  })
})
