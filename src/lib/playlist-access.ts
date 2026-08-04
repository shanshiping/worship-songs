import { prisma } from '@/lib/prisma'
import { isAdminOrAbove } from '@/lib/permissions'
import { getCurrentUser } from '@/lib/server-permissions'

export const playlistSongInclude = {
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

export async function assertCanModifyPlaylist(playlistId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }

  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { createdById: true },
  })

  if (!playlist) {
    return { user, playlist: null }
  }

  const isOwner = playlist.createdById === user.id
  if (isOwner || isAdminOrAbove(user.role)) {
    return { user, playlist }
  }

  throw new Error('权限不足')
}
