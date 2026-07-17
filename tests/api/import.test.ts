import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/import/route'
import { getServerSession } from 'next-auth'

describe('/api/import', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const form = new FormData()
    form.append('file', new File(['x'], 'data.xlsx'))
    const res = await POST(
      new Request('http://localhost/api/import', { method: 'POST', body: form })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('returns 400 when file missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const form = new FormData()
    const res = await POST(
      new Request('http://localhost/api/import', { method: 'POST', body: form })
    )
    const { status, body } = await readJson<{ error: string }>(res)
    expect(status).toBe(400)
    expect(body.error).toMatch(/文件|上传/)
  })
})
