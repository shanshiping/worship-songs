import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import {
  assertCanModifyPlaylist,
  playlistSongInclude,
} from '@/lib/playlist-access'
import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/server-permissions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PLAYLIST_EDIT)

    const { id } = await params
    const { playlist } = await assertCanModifyPlaylist(id)

    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    const body = await request.json()
    const songId = body?.songId
    if (!songId || typeof songId !== 'string') {
      return NextResponse.json({ error: 'songId 为必填项' }, { status: 400 })
    }

    const existing = await prisma.playlistSong.findUnique({
      where: { playlistId_songId: { playlistId: id, songId } },
    })

    if (!existing) {
      const last = await prisma.playlistSong.findFirst({
        where: { playlistId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      await prisma.playlistSong.create({
        data: {
          playlistId: id,
          songId,
          order: (last?.order ?? 0) + 1,
        },
      })
    }

    const updated = await prisma.playlist.findUnique({
      where: { id },
      include: playlistSongInclude,
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Add playlist song error:', error)
    const message = getErrorMessage(error, '添加歌曲失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
