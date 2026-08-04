import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/lyrics-ocr', () => ({
  extractLyricsFromSheet: vi.fn(),
}))
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

import { extractLyricsFromSheet } from '@/lib/lyrics-ocr'
import { readFile } from 'fs/promises'
import {
  resolveLyricsWithAutoExtract,
  resolveSheetPath,
  tryExtractLyricsFromSheetPath,
} from '@/lib/sheet-lyrics'

describe('sheet-lyrics', () => {
  beforeEach(() => {
    vi.mocked(extractLyricsFromSheet).mockReset()
    vi.mocked(readFile).mockReset()
    delete process.env.GEMINI_API_KEY
    delete process.env.LYRICS_OCR_PROVIDER
    delete process.env.AI_API_KEY
  })

  it('resolveSheetPath rejects unsafe paths', () => {
    expect(resolveSheetPath('/uploads/sheets/../secret.pdf')).toBeNull()
    expect(resolveSheetPath('/uploads/audio/a.mp3')).toBeNull()
    expect(resolveSheetPath('/uploads/sheets/test.png')).toEqual({
      absolutePath: expect.stringContaining('public/uploads/sheets/test.png'),
      mimeType: 'image/png',
    })
  })

  it('tryExtractLyricsFromSheetPath returns null without OCR config', async () => {
    await expect(
      tryExtractLyricsFromSheetPath('/uploads/sheets/a.png'),
    ).resolves.toBeNull()
  })

  it('tryExtractLyricsFromSheetPath returns extracted lyrics', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(readFile).mockResolvedValue(Buffer.from('img'))
    vi.mocked(extractLyricsFromSheet).mockResolvedValue('  哈利路亚\n  ')

    await expect(
      tryExtractLyricsFromSheetPath('/uploads/sheets/a.png'),
    ).resolves.toBe('哈利路亚')
  })

  it('resolveLyricsWithAutoExtract keeps existing lyrics', async () => {
    await expect(
      resolveLyricsWithAutoExtract('/uploads/sheets/a.png', '已有歌词'),
    ).resolves.toBe('已有歌词')
    expect(extractLyricsFromSheet).not.toHaveBeenCalled()
  })

  it('resolveLyricsWithAutoExtract extracts when lyrics empty', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(readFile).mockResolvedValue(Buffer.from('img'))
    vi.mocked(extractLyricsFromSheet).mockResolvedValue('新歌词')

    await expect(
      resolveLyricsWithAutoExtract('/uploads/sheets/a.png', ''),
    ).resolves.toBe('新歌词')
  })
})
