import { prisma } from '@/lib/prisma'

export type ThemeMeetingSong = {
  id: string
  title: string
  artist: string | null
  sheetMusic: string | null
}

export type ThemeMeetingMatch = {
  id: string
  date: string
  theme: string | null
  leader: string | null
  songs: ThemeMeetingSong[]
}

export const MIN_THEME_SEARCH_LENGTH = 2
export const DEFAULT_THEME_SEARCH_LIMIT = 5

export function isValidThemeSearchQuery(query: string): boolean {
  return query.trim().length >= MIN_THEME_SEARCH_LENGTH
}

export async function searchMeetingsByTheme(
  query: string,
  limit = DEFAULT_THEME_SEARCH_LIMIT,
): Promise<ThemeMeetingMatch[]> {
  const trimmed = query.trim()
  if (!isValidThemeSearchQuery(trimmed)) {
    return []
  }

  const take = Math.min(Math.max(limit, 1), 20)

  const meetings = await prisma.meeting.findMany({
    where: {
      theme: { contains: trimmed, mode: 'insensitive' },
    },
    include: {
      songs: {
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
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { date: 'desc' },
    take,
  })

  return meetings.map((meeting) => ({
    id: meeting.id,
    date: meeting.date.toISOString(),
    theme: meeting.theme,
    leader: meeting.leader,
    songs: meeting.songs.map((row) => ({
      id: row.song.id,
      title: row.song.title,
      artist: row.song.artist,
      sheetMusic: row.song.sheetMusic,
    })),
  }))
}
