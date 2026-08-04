import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 添加团队成员
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

    // 检查权限（只有团队拥有者和管理员可以添加成员）
    const currentMember = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!currentMember) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, userId, role = 'MEMBER' } = body

    if (!email && !userId) {
      return NextResponse.json(
        { error: '请输入用户名或选择用户' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查是否已经是团队成员
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: user.id,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: '该用户已经是团队成员' },
        { status: 400 }
      )
    }

    // 添加成员
    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: user.id,
        role,
      },
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
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Add team member error:', error)
    return NextResponse.json(
      { error: '添加成员失败' },
      { status: 500 }
    )
  }
}

// 更新成员角色
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

    // 检查权限（只有团队拥有者可以修改成员角色）
    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team || team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: '只有团队创建者可以修改成员角色' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: '用户ID和角色为必填项' },
        { status: 400 }
      )
    }

    // 不能修改自己的角色
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: '不能修改自己的角色' },
        { status: 400 }
      )
    }

    const member = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId: id,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Update member role error:', error)
    return NextResponse.json(
      { error: '更新成员角色失败' },
      { status: 500 }
    )
  }
}

// 删除团队成员
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID为必填项' },
        { status: 400 }
      )
    }

    // 检查权限
    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      return NextResponse.json(
        { error: '团队不存在' },
        { status: 404 }
      )
    }

    // 只有团队拥有者可以删除成员，或者成员自己退出
    const isOwner = team.ownerId === session.user.id
    const isSelf = userId === session.user.id

    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    // 不能删除团队创建者
    if (userId === team.ownerId) {
      return NextResponse.json(
        { error: '不能删除团队创建者' },
        { status: 400 }
      )
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId,
        },
      },
    })

    return NextResponse.json({ message: '成员已删除' })
  } catch (error) {
    console.error('Delete team member error:', error)
    return NextResponse.json(
      { error: '删除成员失败' },
      { status: 500 }
    )
  }
}
