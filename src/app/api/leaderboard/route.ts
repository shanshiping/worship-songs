import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, year, month
    const limit = parseInt(searchParams.get('limit') || '20')

    let dateFilter: any = {}

    if (period === 'year') {
      const startOfYear = new Date()
      startOfYear.setMonth(0, 1)
      startOfYear.setHours(0, 0, 0, 0)
      dateFilter = {
        meeting: {
          date: {
            gte: startOfYear,
          },
        },
      }
    } else if (period === 'month') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      dateFilter = {
        meeting: {
          date: {
            gte: startOfMonth,
          },
        },
      }
    }

    // 获取歌曲使用次数排行
    const topSongs = await prisma.meetingSong.groupBy({
      by: ['songId'],
      where: dateFilter,
      _count: {
        songId: true,
      },
      orderBy: {
        _count: {
          songId: 'desc',
        },
      },
      take: limit,
    })

    // 获取歌曲详情
    const leaderboard = await Promise.all(
      topSongs.map(async (item: any, index: number) => {
        const song = await prisma.song.findUnique({
          where: { id: item.songId },
          include: {
            category: true,
          },
        })

        return {
          rank: index + 1,
          id: song?.id,
          title: song?.title || '未知歌曲',
          artist: song?.artist,
          category: song?.category?.name || '未分类',
          count: item._count.songId,
        }
      })
    )

    return NextResponse.json({
      period,
      leaderboard,
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    )
  }
}
