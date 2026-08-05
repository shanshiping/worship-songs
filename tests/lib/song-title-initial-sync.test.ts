import { describe, expect, it } from 'vitest'
import {
  countSongsByInitial,
  isInitialFieldSchemaError,
  parseSongLetterParam,
  titleInitialFieldsForTitle,
} from '@/lib/song-title-initial-sync'

describe('song-title-initial-sync', () => {
  it('parses hash letter from encoded query values', () => {
    expect(parseSongLetterParam('#')).toBe('#')
    expect(parseSongLetterParam('a')).toBe('A')
    expect(parseSongLetterParam('')).toBe('')
  })

  it('builds initial fields for titles', () => {
    expect(titleInitialFieldsForTitle('神掌权')).toEqual({
      titleInitial: 'S',
      titleInitialOrder: 19,
    })
  })

  it('counts songs by computed initials', () => {
    const counts = countSongsByInitial([
      { title: 'Amazing Grace' },
      { title: 'Amen' },
      { title: '123' },
    ])

    expect(counts.get('A')).toBe(2)
    expect(counts.get('#')).toBe(1)
  })

  it('detects stale prisma client validation errors', () => {
    expect(
      isInitialFieldSchemaError({
        name: 'PrismaClientValidationError',
        message: 'Unknown argument `titleInitialOrder`',
      }),
    ).toBe(true)
  })
})
