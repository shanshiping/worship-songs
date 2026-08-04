import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const songInclude = {
  song: {
    select: {
      id: true,
      title: true,
      artist: true,
      key: true,
      coverImage: true,
    },
  },
  sharedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const

async function requireTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.findFirst({
    where: { teamId, userId },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id } = await params
    const member = await requireTeamMember(id, session.user.id)
    if (!member) {
      return NextResponse.json({ error: '您不是该团队成员' }, { status: 403 })
    }

    const songs = await prisma.teamSong.findMany({
      where: { teamId: id },
      include: songInclude,
      orderBy: { sharedAt: 'desc' },
    })

    return NextResponse.json(songs)
  } catch (error) {
    console.error('Get team songs error:', error)
    return NextResponse.json({ error: '获取团队歌曲失败' }, { status: 500 })
  }
}

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
    const member = await requireTeamMember(id, session.user.id)
    if (!member) {
      return NextResponse.json({ error: '您不是该团队成员' }, { status: 403 })
    }

    const body = await request.json()
    const songId = body?.songId
    if (!songId || typeof songId !== 'string') {
      return NextResponse.json({ error: 'songId 为必填项' }, { status: 400 })
    }

    const song = await prisma.song.findUnique({ where: { id: songId } })
    if (!song) {
      return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
    }

    const existing = await prisma.teamSong.findUnique({
      where: { teamId_songId: { teamId: id, songId } },
    })

    if (existing) {
      const teamSong = await prisma.teamSong.findUnique({
        where: { id: existing.id },
        include: songInclude,
      })
      return NextResponse.json(teamSong)
    }

    const teamSong = await prisma.teamSong.create({
      data: {
        teamId: id,
        songId,
        sharedById: session.user.id,
      },
      include: songInclude,
    })

    await prisma.team.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(teamSong, { status: 201 })
  } catch (error) {
    console.error('Share song to team error:', error)
    return NextResponse.json({ error: '分享歌曲失败' }, { status: 500 })
  }
}

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
    const member = await requireTeamMember(id, session.user.id)
    if (!member) {
      return NextResponse.json({ error: '您不是该团队成员' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('songId')
    if (!songId) {
      return NextResponse.json({ error: 'songId 为必填项' }, { status: 400 })
    }

    const teamSong = await prisma.teamSong.findUnique({
      where: { teamId_songId: { teamId: id, songId } },
    })

    if (!teamSong) {
      return NextResponse.json({ error: '歌曲未分享给该团队' }, { status: 404 })
    }

    const canRemove =
      teamSong.sharedById === session.user.id ||
      member.role === 'OWNER' ||
      member.role === 'ADMIN'

    if (!canRemove) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    await prisma.teamSong.delete({
      where: { id: teamSong.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove team song error:', error)
    return NextResponse.json({ error: '移除歌曲失败' }, { status: 500 })
  }
}
