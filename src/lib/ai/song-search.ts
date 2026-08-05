import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AgentSongResult = {
  id: string
  title: string
  artist: string | null
  hasSheetMusic: boolean
  tags: { name: string; kind: string }[]
  lyricSnippet: string | null
}

function lyricSnippet(lyrics: string | null | undefined): string | null {
  if (!lyrics?.trim()) return null
  const compact = lyrics.replace(/\s+/g, ' ').trim()
  return compact.length > 120 ? `${compact.slice(0, 120)}…` : compact
}

export async function searchSongsForAgent(options: {
  query?: string
  tagNames?: string[]
  limit?: number
}): Promise<AgentSongResult[]> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 10)
  const and: Prisma.SongWhereInput[] = []

  const query = options.query?.trim()
  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { contains: query, mode: 'insensitive' } },
        { lyrics: { contains: query, mode: 'insensitive' } },
      ],
    })
  }

  const tagNames = (options.tagNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)

  if (tagNames.length > 0) {
    const tags = await prisma.tag.findMany({
      where: {
        OR: tagNames.map((name) => ({
          name: { equals: name, mode: 'insensitive' as const },
        })),
      },
      select: { id: true },
    })

    if (tags.length === 0) {
      return []
    }

    for (const tag of tags) {
      and.push({ tags: { some: { tagId: tag.id } } })
    }
  }

  const where: Prisma.SongWhereInput =
    and.length === 0 ? {} : and.length === 1 ? and[0]! : { AND: and }

  const songs = await prisma.song.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return songs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    hasSheetMusic: Boolean(song.sheetMusic?.trim()),
    tags: song.tags.map((st) => ({
      name: st.tag.name,
      kind: st.tag.kind,
    })),
    lyricSnippet: lyricSnippet(song.lyrics),
  }))
}
