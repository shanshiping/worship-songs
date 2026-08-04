import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import {
  assertCanModifyPlaylist,
  playlistSongInclude,
} from '@/lib/playlist-access'
import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/server-permissions'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; songId: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PLAYLIST_EDIT)

    const { id, songId } = await params
    const { playlist } = await assertCanModifyPlaylist(id)

    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    await prisma.playlistSong
      .delete({
        where: { playlistId_songId: { playlistId: id, songId } },
      })
      .catch(() => null)

    const remaining = await prisma.playlistSong.findMany({
      where: { playlistId: id },
      orderBy: { order: 'asc' },
    })

    await Promise.all(
      remaining.map((row, index) =>
        prisma.playlistSong.update({
          where: {
            playlistId_songId: { playlistId: id, songId: row.songId },
          },
          data: { order: index + 1 },
        })
      )
    )

    const updated = await prisma.playlist.findUnique({
      where: { id },
      include: playlistSongInclude,
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Remove playlist song error:', error)
    const message = getErrorMessage(error, '移除歌曲失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
