import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 获取团队详情
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

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
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
          take: 50,
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: '团队不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否是团队成员
    const isMember = team.members.some((m) => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json(
        { error: '您不是该团队成员' },
        { status: 403 }
      )
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json(
      { error: '获取团队详情失败' },
      { status: 500 }
    )
  }
}

// 更新团队
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查权限（只有团队拥有者和管理员可以修改）
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    const team = await prisma.team.update({
      where: { id },
      data: {
        name,
        description,
      },
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error('Update team error:', error)
    return NextResponse.json(
      { error: '更新团队失败' },
      { status: 500 }
    )
  }
}

// 删除团队
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查权限（只有团队拥有者可以删除）
    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      return NextResponse.json(
        { error: '团队不存在' },
        { status: 404 }
      )
    }

    if (team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: '只有团队创建者可以删除团队' },
        { status: 403 }
      )
    }

    await prisma.team.delete({
      where: { id },
    })

    return NextResponse.json({ message: '团队已删除' })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json(
      { error: '删除团队失败' },
      { status: 500 }
    )
  }
}
