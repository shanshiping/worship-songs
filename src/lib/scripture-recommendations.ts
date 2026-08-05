import { prisma } from '@/lib/prisma'

export type ScriptureDirectMatch = {
  id: string
  title: string
  artist: string | null
  sheetMusic: string | null
  reference: string
}

export type ScriptureHistoricalPick = {
  id: string
  title: string
  artist: string | null
  sheetMusic: string | null
  count: number
  lastUsedDate: string | null
}

export type ScriptureRecommendation = {
  directMatches: ScriptureDirectMatch[]
  historicalPicks: ScriptureHistoricalPick[]
}

export const MIN_SCRIPTURE_SEARCH_LENGTH = 2

export function isValidScriptureReference(reference: string): boolean {
  return reference.trim().length >= MIN_SCRIPTURE_SEARCH_LENGTH
}

export async function getScriptureRecommendations(
  reference: string,
): Promise<ScriptureRecommendation> {
  const trimmed = reference.trim()
  if (!isValidScriptureReference(trimmed)) {
    return { directMatches: [], historicalPicks: [] }
  }

  const scriptures = await prisma.songScripture.findMany({
    where: {
      reference: { contains: trimmed, mode: 'insensitive' },
    },
    include: {
      song: {
        select: {
          id: true,
          title: true,
          artist: true,
          sheetMusic: true,
        },
      },
    },
    orderBy: [{ songId: 'asc' }, { order: 'asc' }],
  })

  const directBySongId = new Map<string, ScriptureDirectMatch>()
  for (const row of scriptures) {
    if (directBySongId.has(row.songId)) continue
    directBySongId.set(row.songId, {
      id: row.song.id,
      title: row.song.title,
      artist: row.song.artist,
      sheetMusic: row.song.sheetMusic,
      reference: row.reference,
    })
  }

  const directMatches = [...directBySongId.values()]
  const songIds = directMatches.map((song) => song.id)

  if (songIds.length === 0) {
    return { directMatches: [], historicalPicks: [] }
  }

  const grouped = await prisma.meetingSong.groupBy({
    by: ['songId'],
    where: { songId: { in: songIds } },
    _count: { songId: true },
    orderBy: { _count: { songId: 'desc' } },
  })

  const songsWithUsage = grouped.filter((row) => row._count.songId > 0)
  if (songsWithUsage.length === 0) {
    return { directMatches, historicalPicks: [] }
  }

  const usageSongIds = songsWithUsage.map((row) => row.songId)
  const latestRows = await prisma.meetingSong.findMany({
    where: { songId: { in: usageSongIds } },
    select: {
      songId: true,
      meeting: { select: { date: true } },
    },
    orderBy: { meeting: { date: 'desc' } },
  })

  const lastUsedBySongId = new Map<string, Date>()
  for (const row of latestRows) {
    if (!lastUsedBySongId.has(row.songId)) {
      lastUsedBySongId.set(row.songId, row.meeting.date)
    }
  }

  const songById = new Map(directMatches.map((song) => [song.id, song]))
  const historicalPicks: ScriptureHistoricalPick[] = songsWithUsage
    .map((row) => {
      const song = songById.get(row.songId)
      if (!song) return null
      const lastDate = lastUsedBySongId.get(row.songId)
      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        sheetMusic: song.sheetMusic,
        count: row._count.songId,
        lastUsedDate: lastDate ? lastDate.toISOString() : null,
      }
    })
    .filter((item): item is ScriptureHistoricalPick => Boolean(item))

  return { directMatches, historicalPicks }
}
