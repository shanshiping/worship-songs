import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_PAGE_SIZES = new Set([10, 20, 50])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const pageSize = ALLOWED_PAGE_SIZES.has(rawPageSize) ? rawPageSize : 20

    const year =
      yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : null

    const dateFilter =
      year !== null
        ? {
            meeting: {
              date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
              },
            },
          }
        : {}

    const [grouped, meetings] = await Promise.all([
      prisma.meetingSong.groupBy({
        by: ['songId'],
        where: dateFilter,
        _count: { songId: true },
        orderBy: { _count: { songId: 'desc' } },
      }),
      prisma.meeting.findMany({
        select: { date: true },
      }),
    ])

    const years = [
      ...new Set(meetings.map((m) => m.date.getFullYear())),
    ].sort((a, b) => b - a)

    const allSongIds = grouped.map((g) => g.songId)
    const songs = await prisma.song.findMany({
      where: { id: { in: allSongIds } },
      include: { tags: { include: { tag: true } } },
    })
    const songMap = new Map(songs.map((s) => [s.id, s]))

    const validGrouped = grouped.filter((item) => songMap.has(item.songId))
    const total = validGrouped.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const skip = (page - 1) * pageSize
    const pageGroups = validGrouped.slice(skip, skip + pageSize)

    const leaderboard = pageGroups.map((item, index) => {
      const song = songMap.get(item.songId)!
      const typeTags =
        song.tags
          ?.filter((st) => st.tag.kind === 'TYPE')
          .map((st) => st.tag.name) ?? []
      return {
        rank: skip + index + 1,
        id: song.id,
        title: song.title,
        artist: song.artist,
        category: typeTags.length > 0 ? typeTags.join('、') : '未分类',
        tags: song.tags?.map((st) => st.tag) ?? [],
        count: item._count.songId,
      }
    })

    return NextResponse.json({
      year,
      page,
      pageSize,
      total,
      totalPages,
      years,
      leaderboard,
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 })
  }
}
