import { describe, expect, it } from 'vitest'
import {
  isImageAssetPath,
  pickSongBackgroundPath,
  resolvePublicAssetPath,
} from '@/lib/ppt-song-background'

describe('isImageAssetPath', () => {
  it('accepts common image upload paths', () => {
    expect(isImageAssetPath('/uploads/covers/abc.jpg')).toBe(true)
    expect(isImageAssetPath('/uploads/sheets/abc.png')).toBe(true)
    expect(isImageAssetPath('/uploads/sheets/abc.webp')).toBe(true)
  })

  it('rejects non-image assets', () => {
    expect(isImageAssetPath('/uploads/sheets/abc.pdf')).toBe(false)
    expect(isImageAssetPath('/uploads/audio/abc.mp3')).toBe(false)
    expect(isImageAssetPath(null)).toBe(false)
  })
})

describe('pickSongBackgroundPath', () => {
  it('prefers dedicated ppt background over cover and sheet', () => {
    expect(
      pickSongBackgroundPath({
        pptBackground: '/uploads/ppt-backgrounds/custom.jpg',
        coverImage: '/uploads/covers/a.jpg',
        sheetMusic: '/uploads/sheets/b.png',
      })
    ).toBe('/uploads/ppt-backgrounds/custom.jpg')
  })

  it('prefers cover image over sheet music', () => {
    expect(
      pickSongBackgroundPath({
        coverImage: '/uploads/covers/a.jpg',
        sheetMusic: '/uploads/sheets/b.png',
      })
    ).toBe('/uploads/covers/a.jpg')
  })

  it('falls back to sheet image when cover is missing', () => {
    expect(
      pickSongBackgroundPath({
        coverImage: null,
        sheetMusic: '/uploads/sheets/b.png',
      })
    ).toBe('/uploads/sheets/b.png')
  })
})

describe('resolvePublicAssetPath', () => {
  it('maps web paths to public files', () => {
    expect(resolvePublicAssetPath('/uploads/covers/a.jpg')).toContain(
      'public/uploads/covers/a.jpg'
    )
  })
})
