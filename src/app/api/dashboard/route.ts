import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 获取歌曲总数
    const totalSongs = await prisma.song.count()

    // 获取聚会记录总数
    const totalMeetings = await prisma.meeting.count()

    // 获取分类总数
    const totalCategories = await prisma.category.count()

    // 获取热门歌曲（按使用次数排序）
    const topSongs = await prisma.meetingSong.groupBy({
      by: ['songId'],
      _count: {
        songId: true,
      },
      orderBy: {
        _count: {
          songId: 'desc',
        },
      },
      take: 5,
    })

    // 获取歌曲详情
    const topSongsWithDetails = await Promise.all(
      topSongs.map(async (item: any) => {
        const song = await prisma.song.findUnique({
          where: { id: item.songId },
        })
        return {
          title: song?.title || '未知歌曲',
          count: item._count.songId,
        }
      })
    )

    return NextResponse.json({
      totalSongs,
      totalMeetings,
      totalCategories,
      topSongs: topSongsWithDetails,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: '获取首页数据失败' },
      { status: 500 }
    )
  }
}
