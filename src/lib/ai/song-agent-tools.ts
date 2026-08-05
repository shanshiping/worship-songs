import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { isAdminOrAbove, hasPermission, PERMISSIONS } from '@/lib/permissions'
import { assertCanModifyPlaylist } from '@/lib/playlist-access'
import { getCurrentUser } from '@/lib/server-permissions'
import { searchSongsForAgent } from '@/lib/ai/song-search'
import { searchMeetingsByTheme } from '@/lib/meeting-theme-search'
import { getScriptureRecommendations } from '@/lib/scripture-recommendations'

export function createSongAgentTools() {
  return {
    searchSongs: tool({
      description:
        'Search the song catalog by title, artist, or lyrics fragment. Optionally filter by tag names (TYPE/STYLE).',
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe('Keywords matching title, artist, or lyrics'),
        tagNames: z
          .array(z.string())
          .optional()
          .describe('Tag names to require (AND), e.g. 主日敬拜, 活泼'),
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, tagNames, limit }) => {
        const songs = await searchSongsForAgent({ query, tagNames, limit })
        return { count: songs.length, songs }
      },
    }),

    listTags: tool({
      description: 'List available song tags. kind is TYPE (occasion) or STYLE (mood).',
      inputSchema: z.object({
        kind: z.enum(['TYPE', 'STYLE']).optional(),
      }),
      execute: async ({ kind }) => {
        const tags = await prisma.tag.findMany({
          where: kind ? { kind } : undefined,
          orderBy: [{ kind: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, kind: true },
        })
        return { tags }
      },
    }),

    getPopularSongs: tool({
      description: 'Get frequently used songs from meeting history (leaderboard).',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ limit }) => {
        const take = Math.min(Math.max(limit ?? 8, 1), 10)
        const grouped = await prisma.meetingSong.groupBy({
          by: ['songId'],
          _count: { songId: true },
          orderBy: { _count: { songId: 'desc' } },
          take,
        })

        if (grouped.length === 0) {
          return { songs: [] as const }
        }

        const songs = await prisma.song.findMany({
          where: { id: { in: grouped.map((g) => g.songId) } },
          include: { tags: { include: { tag: true } } },
        })

        const countById = new Map(
          grouped.map((g) => [g.songId, g._count.songId])
        )

        const ordered = grouped
          .map((g) => {
            const song = songs.find((s) => s.id === g.songId)
            if (!song) return null
            return {
              id: song.id,
              title: song.title,
              artist: song.artist,
              hasSheetMusic: Boolean(song.sheetMusic?.trim()),
              usageCount: countById.get(song.id) ?? 0,
              tags: song.tags.map((st) => ({
                name: st.tag.name,
                kind: st.tag.kind,
              })),
            }
          })
          .filter(Boolean)

        return { songs: ordered }
      },
    }),

    searchMeetingsByTheme: tool({
      description:
        'Find past meetings with similar themes and their selected songs.',
      inputSchema: z.object({
        query: z.string().describe('Theme keywords to search in meeting history'),
        limit: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, limit }) => {
        const meetings = await searchMeetingsByTheme(query, limit ?? 5)
        return { count: meetings.length, meetings }
      },
    }),

    getScriptureRecommendations: tool({
      description:
        'Find songs linked to a scripture reference and historically selected in meetings.',
      inputSchema: z.object({
        reference: z.string().describe('Scripture reference, e.g. 约翰福音 3:16'),
      }),
      execute: async ({ reference }) => {
        const recommendations = await getScriptureRecommendations(reference)
        return recommendations
      },
    }),

    listMyPlaylists: tool({
      description:
        'List playlists the current user can modify (own playlists, or all if admin).',
      inputSchema: z.object({}),
      execute: async () => {
        const user = await getCurrentUser()
        if (!user?.id) {
          return { error: '请先登录', playlists: [] as const }
        }

        const playlists = await prisma.playlist.findMany({
          where: isAdminOrAbove(user.role) ? {} : { createdById: user.id },
          select: {
            id: true,
            title: true,
            description: true,
            _count: { select: { songs: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        })

        return {
          playlists: playlists.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            songCount: p._count.songs,
          })),
        }
      },
    }),

    addSongToPlaylist: tool({
      description:
        'Add a song to a playlist by playlistId or exact playlistTitle. Requires playlist edit permission.',
      inputSchema: z.object({
        songId: z.string().describe('Song id from search results'),
        playlistId: z.string().optional(),
        playlistTitle: z.string().optional(),
      }),
      execute: async ({ songId, playlistId, playlistTitle }) => {
        try {
          const user = await getCurrentUser()
          if (!user?.id) {
            return { ok: false, error: '请先登录' }
          }
          if (!hasPermission(user.role, PERMISSIONS.PLAYLIST_EDIT)) {
            return { ok: false, error: '权限不足：需要领队或以上才能修改歌单' }
          }

          let targetId = playlistId?.trim() || ''

          if (!targetId && playlistTitle?.trim()) {
            const title = playlistTitle.trim()
            const matches = await prisma.playlist.findMany({
              where: {
                title: { equals: title, mode: 'insensitive' },
                ...(isAdminOrAbove(user.role)
                  ? {}
                  : { createdById: user.id }),
              },
              select: { id: true, title: true },
              take: 5,
            })

            if (matches.length === 0) {
              return { ok: false, error: `找不到歌单「${title}」` }
            }
            if (matches.length > 1) {
              return {
                ok: false,
                error: '找到多个同名歌单，请用 playlistId 指定',
                candidates: matches,
              }
            }
            targetId = matches[0]!.id
          }

          if (!targetId) {
            return {
              ok: false,
              error: '请提供 playlistId 或 playlistTitle',
            }
          }

          const { playlist } = await assertCanModifyPlaylist(targetId)
          if (!playlist) {
            return { ok: false, error: '歌单不存在' }
          }

          const song = await prisma.song.findUnique({
            where: { id: songId },
            select: { id: true, title: true },
          })
          if (!song) {
            return { ok: false, error: '歌曲不存在' }
          }

          const existing = await prisma.playlistSong.findUnique({
            where: {
              playlistId_songId: { playlistId: targetId, songId },
            },
          })

          if (existing) {
            return {
              ok: true,
              alreadyInPlaylist: true,
              playlistId: targetId,
              songId: song.id,
              songTitle: song.title,
              message: `「${song.title}」已在歌单中`,
            }
          }

          const last = await prisma.playlistSong.findFirst({
            where: { playlistId: targetId },
            orderBy: { order: 'desc' },
            select: { order: true },
          })

          await prisma.playlistSong.create({
            data: {
              playlistId: targetId,
              songId,
              order: (last?.order ?? 0) + 1,
            },
          })

          const pl = await prisma.playlist.findUnique({
            where: { id: targetId },
            select: { title: true },
          })

          return {
            ok: true,
            alreadyInPlaylist: false,
            playlistId: targetId,
            playlistTitle: pl?.title ?? null,
            songId: song.id,
            songTitle: song.title,
            message: `已将「${song.title}」加入歌单`,
          }
        } catch (error: unknown) {
          return {
            ok: false,
            error: getErrorMessage(error, '添加歌曲失败'),
          }
        }
      },
    }),
  }
}
