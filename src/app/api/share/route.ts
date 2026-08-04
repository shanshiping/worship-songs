import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'

const fullSongInclude = {
  tags: { include: { tag: true } },
  scriptures: { orderBy: { order: 'asc' as const } },
} as const

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { type, id } = body

    const token = randomBytes(32).toString('hex')
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${type}/${id}?token=${token}`

    return NextResponse.json({
      url: shareUrl,
      token,
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: '创建分享链接失败' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const token = searchParams.get('token')

    if (!type || !id || !token) {
      return NextResponse.json(
        { error: '无效的分享链接' },
        { status: 400 }
      )
    }

    if (type === 'song') {
      const data = await prisma.song.findUnique({
        where: { id },
        include: {
          ...fullSongInclude,
          meetings: {
            include: {
              meeting: true,
            },
            take: 10,
            orderBy: {
              meeting: {
                date: 'desc',
              },
            },
          },
        },
      })

      if (!data) {
        return NextResponse.json(
          { error: '数据不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    if (type === 'meeting') {
      const data = await prisma.meeting.findUnique({
        where: { id },
        include: {
          songs: {
            include: {
              song: {
                include: fullSongInclude,
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      })

      if (!data) {
        return NextResponse.json(
          { error: '数据不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    if (type === 'playlist') {
      const data = await prisma.playlist.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          songs: {
            include: {
              song: {
                include: fullSongInclude,
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      })

      if (!data) {
        return NextResponse.json(
          { error: '数据不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: '无效的分享类型' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: '获取分享数据失败' },
      { status: 500 }
    )
  }
}
