import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (category) {
      where.categoryId = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { artist: { contains: search } },
      ]
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { meetings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.song.count({ where }),
    ])

    return NextResponse.json({
      songs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Songs API error:', error)
    return NextResponse.json(
      { error: '获取歌曲列表失败' },
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
    const { title, artist, categoryId, sheetMusic, audioFile, lyrics, notes } = body

    if (!title || !categoryId) {
      return NextResponse.json(
        { error: '歌曲名称和分类为必填项' },
        { status: 400 }
      )
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        categoryId,
        sheetMusic,
        audioFile,
        lyrics,
        notes,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    console.error('Create song error:', error)
    return NextResponse.json(
      { error: '创建歌曲失败' },
      { status: 500 }
    )
  }
}
