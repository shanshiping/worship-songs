import { describe, expect, it } from 'vitest'
import {
  getSongSheetPaths,
  parseSheetMusicPages,
  parseSheetMusicPagesInput,
  sheetFieldsFromPages,
  songHasSheetMusic,
} from '@/lib/song-sheet-paths'

describe('song-sheet-paths', () => {
  it('parses valid page paths', () => {
    expect(
      parseSheetMusicPages([
        '/uploads/sheets/a.pdf',
        '/uploads/sheets/b.png',
        'invalid',
        '../etc/passwd',
      ]),
    ).toEqual(['/uploads/sheets/a.pdf', '/uploads/sheets/b.png'])
  })

  it('deduplicates pages when reading a song', () => {
    expect(
      getSongSheetPaths({
        sheetMusic: '/uploads/sheets/legacy.pdf',
        sheetMusicPages: ['/uploads/sheets/a.pdf', '/uploads/sheets/a.pdf'],
      }),
    ).toEqual(['/uploads/sheets/a.pdf'])
  })

  it('falls back to legacy sheetMusic', () => {
    expect(
      getSongSheetPaths({
        sheetMusic: '/uploads/sheets/legacy.pdf',
        sheetMusicPages: [],
      }),
    ).toEqual(['/uploads/sheets/legacy.pdf'])
  })

  it('detects whether a song has sheet music', () => {
    expect(songHasSheetMusic({ sheetMusic: null })).toBe(false)
    expect(songHasSheetMusic({ sheetMusic: '/uploads/sheets/x.pdf' })).toBe(true)
  })

  it('normalizes persisted fields from pages', () => {
    expect(
      sheetFieldsFromPages([
        '/uploads/sheets/1.pdf',
        '/uploads/sheets/2.png',
      ]),
    ).toEqual({
      sheetMusic: '/uploads/sheets/1.pdf',
      sheetMusicPages: ['/uploads/sheets/1.pdf', '/uploads/sheets/2.png'],
    })
  })

  it('prefers sheetMusicPages in API input', () => {
    expect(
      parseSheetMusicPagesInput(
        ['/uploads/sheets/a.pdf'],
        '/uploads/sheets/b.pdf',
      ),
    ).toEqual(['/uploads/sheets/a.pdf'])
  })

  it('falls back to sheetMusic in API input', () => {
    expect(parseSheetMusicPagesInput(undefined, '/uploads/sheets/b.pdf')).toEqual([
      '/uploads/sheets/b.pdf',
    ])
  })
})
