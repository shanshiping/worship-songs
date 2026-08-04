import { describe, expect, it } from 'vitest'
import {
  getRouteParamId,
  isSongDetailId,
  RESERVED_SONG_IDS,
  SONG_UPLOAD_PATH,
} from '@/lib/route-params'

describe('route-params', () => {
  it('getRouteParamId reads string and array values', () => {
    expect(getRouteParamId('song-1')).toBe('song-1')
    expect(getRouteParamId(['song-1', 'extra'])).toBe('song-1')
    expect(getRouteParamId(undefined)).toBe('')
  })

  it('isSongDetailId rejects empty and reserved ids', () => {
    expect(isSongDetailId('')).toBe(false)
    for (const id of RESERVED_SONG_IDS) {
      expect(isSongDetailId(id)).toBe(false)
    }
    expect(isSongDetailId('clxyz123')).toBe(true)
  })

  it('SONG_UPLOAD_PATH points outside dynamic /songs/[id] tree', () => {
    expect(SONG_UPLOAD_PATH).toBe('/song-upload')
    expect(SONG_UPLOAD_PATH.startsWith('/songs/')).toBe(false)
  })
})
