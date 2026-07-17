import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  try {
    // 只有超级管理员可以查看用户列表
    await requirePermission(PERMISSIONS.USER_MANAGE)

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error: unknown) {
    console.error('Get users error:', error)
    const message = getErrorMessage(error, '获取用户列表失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : 403 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // 只有超级管理员可以修改用户角色
    await requirePermission(PERMISSIONS.USER_MANAGE)

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: '用户ID和角色为必填项' },
        { status: 400 }
      )
    }

    // 验证角色是否有效
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'MEMBER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: '无效的角色' },
        { status: 400 }
      )
    }

    // 不能修改自己的角色
    const currentUser = await requirePermission(PERMISSIONS.USER_MANAGE)
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: '不能修改自己的角色' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: unknown) {
    console.error('Update user role error:', error)
    const message = getErrorMessage(error, '更新用户角色失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : 403 }
    )
  }
}
