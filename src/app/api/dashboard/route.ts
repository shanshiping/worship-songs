import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [totalSongs, totalMeetings, totalTags, latestMeeting] = await Promise.all([
      prisma.song.count(),
      prisma.meeting.count(),
      prisma.tag.count(),
      prisma.meeting.findFirst({
        orderBy: { date: 'desc' },
        include: {
          songs: {
            orderBy: { order: 'asc' },
            include: {
              song: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      totalSongs,
      totalMeetings,
      totalCategories: totalTags,
      totalTags,
      latestMeeting: latestMeeting
        ? {
            id: latestMeeting.id,
            date: latestMeeting.date.toISOString(),
            theme: latestMeeting.theme,
            speaker: latestMeeting.speaker,
            leader: latestMeeting.leader,
            type: latestMeeting.type,
            songCount: latestMeeting.songs.length,
            songs: latestMeeting.songs.map((item) => ({
              id: item.song.id,
              title: item.song.title,
            })),
          }
        : null,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: '获取首页数据失败' },
      { status: 500 }
    )
  }
}
