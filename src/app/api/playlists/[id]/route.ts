import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { requirePermission } from '@/lib/server-permissions'
import { PERMISSIONS } from '@/lib/permissions'
import {
  assertCanModifyPlaylist,
  playlistSongInclude,
} from '@/lib/playlist-access'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: playlistSongInclude,
    })

    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    return NextResponse.json(playlist)
  } catch (error) {
    console.error('Get playlist error:', error)
    return NextResponse.json({ error: '获取歌单详情失败' }, { status: 500 })
  }
}

export async function PUT(
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
    const { title, description, songIds } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: '歌单标题为必填项' }, { status: 400 })
    }

    const ids: string[] = Array.isArray(songIds)
      ? songIds.filter((sid: unknown): sid is string => typeof sid === 'string')
      : []

    await prisma.playlistSong.deleteMany({ where: { playlistId: id } })

    const updated = await prisma.playlist.update({
      where: { id },
      data: {
        title: title.trim(),
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        songs: {
          create: ids.map((songId, index) => ({
            songId,
            order: index + 1,
          })),
        },
      },
      include: playlistSongInclude,
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Update playlist error:', error)
    const message = getErrorMessage(error, '更新歌单失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PLAYLIST_DELETE)

    const { id } = await params
    const { playlist } = await assertCanModifyPlaylist(id)

    if (!playlist) {
      return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
    }

    await prisma.playlist.delete({ where: { id } })

    return NextResponse.json({ message: '歌单已删除' })
  } catch (error: unknown) {
    console.error('Delete playlist error:', error)
    const message = getErrorMessage(error, '删除歌单失败')
    return NextResponse.json(
      { error: message },
      { status: message === '请先登录' ? 401 : message === '权限不足' ? 403 : 500 }
    )
  }
}
