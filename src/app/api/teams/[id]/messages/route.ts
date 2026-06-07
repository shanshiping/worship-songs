import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 获取消息列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    // 检查用户是否是团队成员
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: session.user.id,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: '您不是该团队成员' },
        { status: 403 }
      )
    }

    const where: any = {
      teamId: id,
    }

    if (before) {
      where.createdAt = {
        lt: new Date(before),
      }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: '获取消息失败' },
      { status: 500 }
    )
  }
}

// 发送消息
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是团队成员
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: session.user.id,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: '您不是该团队成员' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, type = 'TEXT' } = body

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        teamId: id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // 更新团队的 updatedAt
    await prisma.team.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: '发送消息失败' },
      { status: 500 }
    )
  }
}
