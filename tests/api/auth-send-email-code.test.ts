import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/send-email', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/auth/send-email-code/route'
import { sendVerificationEmail } from '@/lib/send-email'
import { _clearVerificationCodesForTests } from '@/lib/verification-codes'

describe('/api/auth/send-email-code', () => {
  beforeEach(() => {
    resetPrismaMock()
    _clearVerificationCodesForTests()
    vi.mocked(sendVerificationEmail).mockClear()
  })

  it('returns 400 for invalid email', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-email-code', {
        method: 'POST',
        body: { email: 'not-an-email' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('returns 400 when email already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-email-code', {
        method: 'POST',
        body: { email: 'a@b.com' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('sends verification email for new address', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/auth/send-email-code', {
        method: 'POST',
        body: { email: 'new@example.com' },
      })
    )
    const { status, body } = await readJson<{ message: string; code?: string }>(res)
    expect(status).toBe(200)
    expect(body.message).toBe('验证码已发送')
    expect(sendVerificationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String))
  })
})
