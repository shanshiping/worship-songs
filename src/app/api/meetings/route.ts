import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const month = searchParams.get('month')

    const where: any = {}

    if (month) {
      const startDate = new Date(month + '-01')
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)

      where.date = {
        gte: startDate,
        lt: endDate,
      }
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          songs: {
            include: {
              song: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.meeting.count({ where }),
    ])

    return NextResponse.json({
      meetings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Meetings API error:', error)
    return NextResponse.json(
      { error: '获取聚会列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { date, theme, speaker, leader, type, notes, songIds } = body

    if (!date) {
      return NextResponse.json(
        { error: '聚会日期为必填项' },
        { status: 400 }
      )
    }

    const meeting = await prisma.meeting.create({
      data: {
        date: new Date(date),
        theme,
        speaker,
        leader,
        type: type || 'MORNING',
        notes,
        songs: {
          create: songIds?.map((songId: string, index: number) => ({
            songId,
            order: index + 1,
          })) || [],
        },
      },
      include: {
        songs: {
          include: {
            song: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('Create meeting error:', error)
    return NextResponse.json(
      { error: '创建聚会记录失败' },
      { status: 500 }
    )
  }
}
