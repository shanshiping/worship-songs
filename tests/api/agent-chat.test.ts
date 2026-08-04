import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { POST } from '@/app/api/agent/chat/route'
import { getServerSession } from 'next-auth'

describe('POST /api/agent/chat', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
    delete process.env.AI_API_KEY
    delete process.env.AI_MODEL
    delete process.env.AI_BASE_URL
  })

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await POST(
      jsonRequest('http://localhost/api/agent/chat', {
        method: 'POST',
        body: { messages: [] },
      })
    )
    const { status, body } = await readJson<{ error: string }>(res)

    expect(status).toBe(401)
    expect(body.error).toContain('登录')
  })

  it('returns 503 when AI_API_KEY is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })

    const res = await POST(
      jsonRequest('http://localhost/api/agent/chat', {
        method: 'POST',
        body: { messages: [] },
      })
    )
    const { status, body } = await readJson<{ error: string }>(res)

    expect(status).toBe(503)
    expect(body.error).toMatch(/AI_API_KEY|不可用/)
  })
})
