import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { POST } from '@/app/api/auth/send-code/route'

describe('/api/auth/send-code', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns 400 for invalid phone', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-code', {
        method: 'POST',
        body: { phone: '123' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('returns 400 when phone not registered', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-code', {
        method: 'POST',
        body: { phone: '13800138000' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('sends code for registered phone', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', phone: '13800138001' })
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-code', {
        method: 'POST',
        body: { phone: '13800138001' },
      })
    )
    const { status, body } = await readJson<{ message: string }>(res)
    expect(status).toBe(200)
    expect(body.message).toBe('验证码已发送')
  })
})
