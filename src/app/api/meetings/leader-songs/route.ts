import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeaderSongStats, sortLeadersByRecentAppearance } from '@/lib/leader-songs'
import {
  leaderNameVariants,
  normalizeLeaderName,
} from '@/lib/leader-names'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const leader = searchParams.get('leader')?.trim() || null
    const limitParam = searchParams.get('limit')
    const limitPerLeader =
      limitParam === null || limitParam === ''
        ? undefined
        : Number.isFinite(parseInt(limitParam, 10))
          ? Math.min(Math.max(parseInt(limitParam, 10), 1), 500)
          : undefined

    const year =
      yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : null

    const meetingWhere: Prisma.MeetingWhereInput = {}

    if (leader) {
      const variants = leaderNameVariants(leader)
      meetingWhere.leader = variants.length === 1 ? variants[0] : { in: variants }
    } else {
      meetingWhere.leader = { not: null }
    }

    if (year !== null) {
      meetingWhere.date = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      }
    }

    const [rows, leaderRows, allMeetings] = await Promise.all([
      prisma.meetingSong.findMany({
        where: { meeting: meetingWhere },
        select: {
          songId: true,
          meeting: { select: { id: true, leader: true, date: true } },
          song: {
            select: { id: true, title: true, artist: true },
          },
        },
      }),
      prisma.meeting.findMany({
        where: { leader: { not: null } },
        select: { leader: true, date: true },
      }),
      prisma.meeting.findMany({
        select: { date: true },
      }),
    ])

    const years = [
      ...new Set(allMeetings.map((m) => m.date.getFullYear())),
    ].sort((a, b) => b - a)

    const leaders = sortLeadersByRecentAppearance(leaderRows)

    const inputs = rows
      .map((row) => ({
        leader: row.meeting.leader?.trim() ?? '',
        meetingId: row.meeting.id,
        meetingDate: row.meeting.date,
        songId: row.songId,
        song: row.song,
      }))
      .filter((row) => row.leader)

    const stats = buildLeaderSongStats(inputs, {
      leader: leader ?? undefined,
      limitPerLeader,
    })

    return NextResponse.json({
      year,
      leader: leader ? normalizeLeaderName(leader) : null,
      limitPerLeader,
      years,
      leaders,
      stats,
    })
  } catch (error) {
    console.error('Leader songs API error:', error)
    return NextResponse.json({ error: '获取主领选歌统计失败' }, { status: 500 })
  }
}
