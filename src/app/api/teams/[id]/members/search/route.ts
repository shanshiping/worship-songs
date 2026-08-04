import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    const q = searchParams.get('q')?.trim() ?? ''

    if (q.length < 1) {
      return NextResponse.json([])
    }

    const currentMember = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!currentMember) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const existingMembers = await prisma.teamMember.findMany({
      where: { teamId: id },
      select: { userId: true },
    })
    const excludeIds = existingMembers.map((m) => m.userId)

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Search team members error:', error)
    return NextResponse.json({ error: '搜索用户失败' }, { status: 500 })
  }
}
