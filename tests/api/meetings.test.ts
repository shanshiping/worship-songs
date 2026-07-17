import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { GET, POST } from '@/app/api/meetings/route'
import { getServerSession } from 'next-auth'

describe('/api/meetings', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('GET returns meetings, years, pagination', async () => {
    mockPrisma.meeting.findMany
      .mockResolvedValueOnce([
        {
          id: 'm1',
          date: new Date('2026-03-01'),
          songs: [],
        },
      ])
      .mockResolvedValueOnce([{ date: new Date('2026-03-01') }, { date: new Date('2025-01-01') }])
    mockPrisma.meeting.count.mockResolvedValue(1)

    const res = await GET(
      jsonRequest('http://localhost/api/meetings?year=2026&page=1&limit=20')
    )
    const { status, body } = await readJson<{
      meetings: unknown[]
      years: number[]
      pagination: { total: number }
    }>(res)

    expect(status).toBe(200)
    expect(body.meetings).toHaveLength(1)
    expect(body.years).toEqual([2026, 2025])
    expect(body.pagination.total).toBe(1)
  })

  it('POST returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/meetings', {
        method: 'POST',
        body: { date: '2026-01-01' },
      })
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('POST returns 400 without date', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const res = await POST(
      jsonRequest('http://localhost/api/meetings', {
        method: 'POST',
        body: { theme: 'x' },
      })
    )
    expect((await readJson(res)).status).toBe(400)
  })

  it('POST creates meeting', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    mockPrisma.meeting.create.mockResolvedValue({
      id: 'm1',
      date: new Date('2026-01-01'),
      songs: [],
    })

    const res = await POST(
      jsonRequest('http://localhost/api/meetings', {
        method: 'POST',
        body: { date: '2026-01-01', songIds: ['s1'] },
      })
    )
    const { status } = await readJson(res)
    expect(status).toBe(201)
    expect(mockPrisma.meeting.create).toHaveBeenCalled()
  })
})
