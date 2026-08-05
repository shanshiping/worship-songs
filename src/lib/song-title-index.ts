import { pinyin } from 'pinyin-pro'

export const SONG_INDEX_LETTERS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  '#',
] as const

export type SongIndexLetter = (typeof SONG_INDEX_LETTERS)[number]

const LETTER_ORDER: Record<SongIndexLetter, number> = {
  '#': 27,
  ...Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter, index) => [letter, index + 1]),
  ),
} as Record<SongIndexLetter, number>

/** Sort key so lists run A→Z, then # last. */
export function getTitleInitialOrder(initial: SongIndexLetter): number {
  return LETTER_ORDER[initial]
}

/** First index letter for a song title: A–Z, or # for digits/symbols/unknown. */
export function getSongTitleInitial(title: string): SongIndexLetter {
  const trimmed = title.trim()
  if (!trimmed) return '#'

  const first = trimmed[0]!
  if (/[A-Za-z]/.test(first)) return first.toUpperCase() as SongIndexLetter
  if (/[0-9]/.test(first)) return '#'

  const initial = pinyin(first, { pattern: 'first', toneType: 'none' }).toUpperCase()
  return /^[A-Z]$/.test(initial) ? (initial as SongIndexLetter) : '#'
}

export function isSongIndexLetter(value: string): value is SongIndexLetter {
  return (SONG_INDEX_LETTERS as readonly string[]).includes(value)
}

export function compareSongTitles(a: string, b: string): number {
  return a.localeCompare(b, ['zh-CN', 'en'], { sensitivity: 'base', numeric: true })
}
