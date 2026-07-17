import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'


vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => Buffer.from('xlsx')),
}))

import { GET } from '@/app/api/export/route'

describe('/api/export', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('returns an xlsx attachment', async () => {
    mockPrisma.meeting.findMany.mockResolvedValue([
      {
        id: 'm1',
        date: new Date('2026-01-15'),
        theme: '主题',
        speaker: null,
        leader: null,
        notes: null,
        songs: [{ song: { title: '神掌权' } }],
      },
    ])

    const res = await GET(jsonRequest('http://localhost/api/export?year=2026'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })
})
