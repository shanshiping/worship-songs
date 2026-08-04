import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest, readJson } from '../helpers/request'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import { GET } from '@/app/api/tags/route'

describe('/api/tags', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('GET returns all tags', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 't1', name: '敬拜赞美', kind: 'TYPE' },
      { id: 't2', name: '活泼', kind: 'STYLE' },
    ])

    const res = await GET(jsonRequest('http://localhost/api/tags'))
    const { status, body } = await readJson<{ tags: unknown[] }>(res)

    expect(status).toBe(200)
    expect(body.tags).toHaveLength(2)
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    )
  })

  it('GET filters by kind', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 't2', name: '活泼', kind: 'STYLE' },
    ])

    const res = await GET(jsonRequest('http://localhost/api/tags?kind=STYLE'))
    const { status, body } = await readJson<{ tags: Array<{ kind: string }> }>(res)

    expect(status).toBe(200)
    expect(body.tags[0].kind).toBe('STYLE')
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kind: 'STYLE' } })
    )
  })
})
