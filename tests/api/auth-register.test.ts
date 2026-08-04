import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed'),
}))

import { POST } from '@/app/api/auth/register/route'
import {
  _clearVerificationCodesForTests,
  emailVerificationKey,
  setVerificationCode,
} from '@/lib/verification-codes'

describe('/api/auth/register', () => {
  beforeEach(() => {
    resetPrismaMock()
    _clearVerificationCodesForTests()
  })

  it('returns 400 when fields missing', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: { email: 'a@b.com' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('returns 400 when verification code invalid', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: { name: 'A', email: 'a@b.com', password: 'secret', code: '000000' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('returns 400 when email exists', async () => {
    setVerificationCode(emailVerificationKey('a@b.com'), '123456')
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' })
    const res = await POST(
      jsonRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: { name: 'A', email: 'a@b.com', password: 'secret', code: '123456' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('creates verified user with valid code', async () => {
    setVerificationCode(emailVerificationKey('a@b.com'), '123456')
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1',
      name: 'A',
      email: 'a@b.com',
      role: 'MEMBER',
    })

    const res = await POST(
      jsonRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: { name: 'A', email: 'a@b.com', password: 'secret', code: '123456' },
      })
    )

    expect((await readJson(res)).status).toBe(201)
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a@b.com',
          emailVerified: expect.any(Date),
        }),
      })
    )
  })
})
