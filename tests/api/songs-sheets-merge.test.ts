import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import { jsonRequest } from '../helpers/request'

const requirePermission = vi.hoisted(() => vi.fn())
const mergeSheetMusicPdfDetailed = vi.hoisted(() => vi.fn())
const readSheetBytes = vi.hoisted(() => vi.fn())
const resolveSheetPath = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('@/lib/server-permissions', () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}))
vi.mock('@/lib/sheet-pdf-merge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sheet-pdf-merge')>(
    '@/lib/sheet-pdf-merge',
  )
  return {
    ...actual,
    mergeSheetMusicPdfDetailed: (...args: unknown[]) => mergeSheetMusicPdfDetailed(...args),
  }
})
vi.mock('@/lib/sheet-lyrics', () => ({
  readSheetBytes: (...args: unknown[]) => readSheetBytes(...args),
  resolveSheetPath: (...args: unknown[]) => resolveSheetPath(...args),
}))

import { POST } from '@/app/api/songs/sheets/merge/route'

describe('POST /api/songs/sheets/merge', () => {
  beforeEach(() => {
    resetPrismaMock()
    requirePermission.mockReset()
    mergeSheetMusicPdfDetailed.mockReset()
    readSheetBytes.mockReset()
    resolveSheetPath.mockReset()
    requirePermission.mockResolvedValue({ id: 'u1', role: 'LEADER' })
    mergeSheetMusicPdfDetailed.mockResolvedValue({
      pdf: new Uint8Array([1, 2, 3]),
      failedTitles: [],
    })
    resolveSheetPath.mockReturnValue({
      absolutePath: '/tmp/sheet.pdf',
      mimeType: 'application/pdf',
    })
    readSheetBytes.mockResolvedValue(Buffer.from('pdf'))
  })

  it('returns 401 when not logged in', async () => {
    requirePermission.mockRejectedValue(new Error('请先登录'))

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1'] },
      }),
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when permission denied', async () => {
    requirePermission.mockRejectedValue(new Error('权限不足'))

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1'] },
      }),
    )

    expect(res.status).toBe(403)
  })

  it('returns 400 when songIds is empty', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: [] },
      }),
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 when all songs lack sheet music', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's1', title: '无歌谱歌', sheetMusic: null },
    ])

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1'] },
      }),
    )

    expect(res.status).toBe(400)
  })

  it('returns pdf attachment and preserves order', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's2', title: '第二首', sheetMusic: '/uploads/sheets/2.pdf', sheetMusicPages: null },
      { id: 's1', title: '第一首', sheetMusic: '/uploads/sheets/1.pdf', sheetMusicPages: null },
    ])

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1', 's2'] },
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('worship-sheets-')
    expect(mergeSheetMusicPdfDetailed).toHaveBeenCalledOnce()
    const inputs = mergeSheetMusicPdfDetailed.mock.calls[0]?.[0] as Array<{ title: string }>
    expect(inputs.map((item) => item.title)).toEqual(['第一首', '第二首'])
  })

  it('merges all pages for a song with multiple sheet files', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: '混合歌',
        sheetMusic: '/uploads/sheets/1.pdf',
        sheetMusicPages: ['/uploads/sheets/1.pdf', '/uploads/sheets/1b.png'],
      },
    ])
    resolveSheetPath.mockImplementation((path: string) => ({
      absolutePath: `/tmp/${path.split('/').pop()}`,
      mimeType: path.endsWith('.pdf') ? 'application/pdf' : 'image/png',
    }))
    readSheetBytes.mockResolvedValue(Buffer.from('bytes'))

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1'] },
      }),
    )

    expect(res.status).toBe(200)
    const inputs = mergeSheetMusicPdfDetailed.mock.calls[0]?.[0] as Array<{ title: string }>
    expect(inputs).toHaveLength(2)
    expect(inputs.map((item) => item.title)).toEqual([
      '混合歌 (1/2)',
      '混合歌 (2/2)',
    ])
  })

  it('skips songs without sheet music via header', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's1', title: '有歌谱', sheetMusic: '/uploads/sheets/1.pdf', sheetMusicPages: null },
      { id: 's2', title: '无歌谱', sheetMusic: null, sheetMusicPages: null },
    ])

    const res = await POST(
      jsonRequest('http://localhost/api/songs/sheets/merge', {
        method: 'POST',
        body: { songIds: ['s1', 's2'] },
      }),
    )

    expect(res.status).toBe(200)
    const skipped = decodeURIComponent(res.headers.get('X-Skipped-Songs') ?? '')
    expect(skipped).toContain('无歌谱')
  })
})
