import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { type, id, password } = body

    // 生成分享令牌
    const token = randomBytes(32).toString('hex')

    // 存储分享信息（这里简化处理，实际应该存到数据库）
    // 这里我们直接返回一个分享链接
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

    // 验证 token（简化处理，实际应该验证数据库中的 token）
    // 这里我们直接返回数据

    let data: any = null

    if (type === 'song') {
      data = await prisma.song.findUnique({
        where: { id },
        include: {
          category: true,
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
    } else if (type === 'meeting') {
      data = await prisma.meeting.findUnique({
        where: { id },
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
    }

    if (!data) {
      return NextResponse.json(
        { error: '数据不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: '获取分享数据失败' },
      { status: 500 }
    )
  }
}
