import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/server-permissions', () => ({
  getCurrentUser: vi.fn(),
}))

import { POST } from '@/app/api/songs/sheets/share/route'
import { getCurrentUser } from '@/lib/server-permissions'

describe('POST /api/songs/sheets/share', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getCurrentUser).mockReset()
  })

  it('returns 401 without login', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/share', {
        method: 'POST',
        body: { songIds: ['s1'] },
      }),
    )
    expect((await readJson(res)).status).toBe(401)
  })

  it('returns share url for valid selection', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      role: 'LEADER',
      email: 'l@test.com',
      name: 'Leader',
    })
    mockPrisma.song.findMany.mockResolvedValue([{ id: 's1' }])
    mockPrisma.sheetsShare.create.mockResolvedValue({ id: 'share1' })

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/share', {
        method: 'POST',
        body: {
          theme: 'Thanksgiving',
          scripture: 'Psalm 100',
          arrangement: 'Song 1 → Song 2 same key',
          songIds: ['s1'],
        },
      }),
    )

    const { status, body } = await readJson<{ url: string; token: string; id: string }>(res)
    expect(status).toBe(200)
    expect(body.id).toBe('share1')
    expect(body.url).toContain('/share/sheets/share1')
    expect(body.token).toBeTruthy()
  })

  it('returns 400 when no songs selected', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      role: 'MEMBER',
      email: 'm@test.com',
      name: 'Member',
    })

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/share', {
        method: 'POST',
        body: { songIds: [] },
      }),
    )
    expect((await readJson(res)).status).toBe(400)
  })
})
