import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'

const playlistSongInclude = {
  songs: {
    include: {
      song: {
        include: {
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where = search
      ? {
          title: { contains: search, mode: 'insensitive' as const },
        }
      : {}

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          ...playlistSongInclude,
          _count: { select: { songs: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.playlist.count({ where }),
    ])

    return NextResponse.json({
      playlists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Playlists API error:', error)
    return NextResponse.json({ error: '获取歌单列表失败' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission(PERMISSIONS.PLAYLIST_CREATE)

    const body = await request.json()
    const { title, description, songIds } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: '歌单标题为必填项' }, { status: 400 })
    }

    const ids: string[] = Array.isArray(songIds)
      ? songIds.filter((id: unknown): id is string => typeof id === 'string')
      : []

    const playlist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        createdById: user.id,
        songs: {
          create: ids.map((songId, index) => ({
            songId,
            order: index + 1,
          })),
        },
      },
      include: playlistSongInclude,
    })

    return NextResponse.json(playlist, { status: 201 })
  } catch (error: unknown) {
    console.error('Create playlist error:', error)
    const message = getErrorMessage(error, '创建歌单失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
