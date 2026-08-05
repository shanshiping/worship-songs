import type { PrismaClient } from '@prisma/client'
import {
  getSongTitleInitial,
  getTitleInitialOrder,
  SONG_INDEX_LETTERS,
  type SongIndexLetter,
} from '@/lib/song-title-index'

export type SongTitleInitialRow = {
  id: string
  title: string
  titleInitial: string
  titleInitialOrder?: number | null
}

export function titleInitialFieldsForTitle(title: string): {
  titleInitial: SongIndexLetter
  titleInitialOrder: number
} {
  const titleInitial = getSongTitleInitial(title)
  return {
    titleInitial,
    titleInitialOrder: getTitleInitialOrder(titleInitial),
  }
}

export function parseSongLetterParam(raw: string | null): SongIndexLetter | '' {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return ''
  const letter = trimmed === '#' ? '#' : trimmed.toUpperCase()
  return (SONG_INDEX_LETTERS as readonly string[]).includes(letter)
    ? (letter as SongIndexLetter)
    : ''
}

export function isMissingPrismaColumn(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  if (code !== 'P2022') return false
  const meta = 'meta' in error ? error.meta : null
  if (!meta || typeof meta !== 'object') return false
  const columnName =
    'column' in meta
      ? String(meta.column)
      : 'modelName' in meta
        ? JSON.stringify(meta)
        : ''
  return columnName.includes(column)
}

export function isInitialFieldSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String(error.name) : ''
  if (name !== 'PrismaClientValidationError') {
    return (
      isMissingPrismaColumn(error, 'titleInitial') ||
      isMissingPrismaColumn(error, 'titleInitialOrder')
    )
  }
  const message = 'message' in error ? String(error.message) : ''
  return message.includes('titleInitial')
}

export async function loadSongsForInitialIndex(
  prisma: PrismaClient,
): Promise<SongTitleInitialRow[]> {
  try {
    return await prisma.song.findMany({
      select: { id: true, title: true, titleInitial: true, titleInitialOrder: true },
    })
  } catch (error) {
    if (!isInitialFieldSchemaError(error)) throw error
    return prisma.song.findMany({
      select: { id: true, title: true },
    })
  }
}

function staleInitialUpdates(songs: SongTitleInitialRow[]) {
  const updates: Array<{
    id: string
    titleInitial: SongIndexLetter
    titleInitialOrder: number
  }> = []

  for (const song of songs) {
    const next = titleInitialFieldsForTitle(song.title)
    if (
      song.titleInitial !== next.titleInitial ||
      song.titleInitialOrder == null ||
      song.titleInitialOrder !== next.titleInitialOrder
    ) {
      updates.push({ id: song.id, ...next })
    }
  }

  return updates
}

export async function syncSongTitleInitials(prisma: PrismaClient): Promise<number> {
  const songs = await loadSongsForInitialIndex(prisma)
  const updates = staleInitialUpdates(songs)
  return applyInitialUpdates(prisma, updates)
}

export async function syncStaleSongTitleInitials(
  prisma: PrismaClient,
  songs: SongTitleInitialRow[],
): Promise<number> {
  return applyInitialUpdates(prisma, staleInitialUpdates(songs))
}

async function applyInitialUpdates(
  prisma: PrismaClient,
  updates: Array<{
    id: string
    titleInitial: SongIndexLetter
    titleInitialOrder: number
  }>,
): Promise<number> {
  if (updates.length === 0) return 0

  const chunkSize = 50
  for (let index = 0; index < updates.length; index += chunkSize) {
    const chunk = updates.slice(index, index + chunkSize)
    try {
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.song.update({
            where: { id: item.id },
            data: {
              titleInitial: item.titleInitial,
              titleInitialOrder: item.titleInitialOrder,
            },
          }),
        ),
      )
    } catch (error) {
      if (!isMissingPrismaColumn(error, 'titleInitialOrder')) throw error
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.song.update({
            where: { id: item.id },
            data: { titleInitial: item.titleInitial },
          }),
        ),
      )
    }
  }

  return updates.length
}

export function countSongsByInitial(
  songs: Array<{ title: string }>,
): Map<SongIndexLetter, number> {
  const counts = new Map<SongIndexLetter, number>()
  for (const letter of SONG_INDEX_LETTERS) {
    counts.set(letter, 0)
  }
  for (const song of songs) {
    const initial = getSongTitleInitial(song.title)
    counts.set(initial, (counts.get(initial) ?? 0) + 1)
  }
  return counts
}

export const songListOrderByPreferred = [
  { titleInitialOrder: 'asc' as const },
  { title: 'asc' as const },
]

export const songListOrderByFallback = [{ title: 'asc' as const }]
