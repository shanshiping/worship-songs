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
  it('uses dedicated ppt background when set', () => {
    expect(
      pickSongBackgroundPath({
        pptBackground: '/uploads/ppt-backgrounds/custom.jpg',
        coverImage: '/uploads/covers/a.jpg',
        sheetMusic: '/uploads/sheets/b.png',
      })
    ).toBe('/uploads/ppt-backgrounds/custom.jpg')
  })

  it('does not fall back to cover or sheet music', () => {
    expect(
      pickSongBackgroundPath({
        coverImage: '/uploads/covers/a.jpg',
        sheetMusic: '/uploads/sheets/b.png',
      })
    ).toBeNull()
  })
})

describe('resolvePublicAssetPath', () => {
  it('maps web paths to public files', () => {
    expect(resolvePublicAssetPath('/uploads/covers/a.jpg')).toContain(
      'public/uploads/covers/a.jpg'
    )
  })
})
