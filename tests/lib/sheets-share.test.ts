import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})

import {
  buildSheetsShareUrl,
  createSheetsShare,
  isSheetsShareSchemaError,
  normalizeSheetsShareSectionIds,
  normalizeSheetsShareSongIds,
  SHEETS_SHARE_MAX_SONGS,
} from '@/lib/sheets-share'

describe('sheets-share lib', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('normalizeSheetsShareSongIds dedupes and trims', () => {
    expect(normalizeSheetsShareSongIds(['a', 'a', 'b', '', 1])).toEqual(['a', 'b'])
  })

  it('buildSheetsShareUrl includes type and token', () => {
    const url = buildSheetsShareUrl('share1', 'tok', 'http://example.com')
    expect(url).toBe('http://example.com/share/sheets/share1?token=tok')
  })

  it('createSheetsShare rejects empty song list', async () => {
    await expect(createSheetsShare({ songIds: [] })).rejects.toThrow('请选择至少一首歌曲')
  })

  it('createSheetsShare rejects too many songs', async () => {
    const ids = Array.from({ length: SHEETS_SHARE_MAX_SONGS + 1 }, (_, i) => `s${i}`)
    await expect(createSheetsShare({ songIds: ids })).rejects.toThrow('最多选择')
  })

  it('normalizeSheetsShareSectionIds dedupes across sections', () => {
    expect(
      normalizeSheetsShareSectionIds({
        songIds: ['a', 'b'],
        responseSongIds: ['a', 'c'],
        communionSongIds: ['b', 'd'],
      }),
    ).toEqual({
      main: ['a', 'b'],
      response: ['c'],
      communion: ['d'],
    })
  })

  it('createSheetsShare rejects empty main and response lists', async () => {
    await expect(
      createSheetsShare({ songIds: [], responseSongIds: [], communionSongIds: ['c1'] }),
    ).rejects.toThrow('请选择至少一首歌曲')
  })

  it('createSheetsShare creates ordered share record', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      { id: 's2' },
      { id: 's1' },
      { id: 'r1' },
      { id: 'c1' },
    ])
    mockPrisma.sheetsShare.create.mockResolvedValue({ id: 'share1' })

    const result = await createSheetsShare({
      theme: '  Easter ',
      scripture: 'John 3:16',
      arrangement: '  Opening fast ',
      songIds: ['s2', 's1', 'missing'],
      responseSongIds: ['r1', 's2'],
      communionSongIds: ['c1'],
      createdById: 'u1',
    })

    expect(result.id).toBe('share1')
    expect(result.token).toHaveLength(64)
    expect(result.url).toContain('/share/sheets/share1')

    expect(mockPrisma.sheetsShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          theme: 'Easter',
          scripture: 'John 3:16',
          arrangement: 'Opening fast',
          createdById: 'u1',
          songs: {
            create: [
              { songId: 's2', order: 1, section: 'main' },
              { songId: 's1', order: 2, section: 'main' },
              { songId: 'r1', order: 1, section: 'response' },
              { songId: 'c1', order: 1, section: 'communion' },
            ],
          },
        }),
      }),
    )
  })
})

describe('isSheetsShareSchemaError', () => {
  it('detects schema-not-ready message', () => {
    expect(isSheetsShareSchemaError(new Error('SHEETS_SHARE_SCHEMA_NOT_READY'))).toBe(true)
    expect(isSheetsShareSchemaError(new Error('other'))).toBe(false)
  })

  it('detects stale Prisma client missing arrangement field', () => {
    expect(
      isSheetsShareSchemaError({
        name: 'PrismaClientValidationError',
        message: 'Unknown argument `arrangement`. Available options are marked with ?.',
      }),
    ).toBe(true)
  })
})
