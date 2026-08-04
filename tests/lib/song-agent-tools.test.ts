import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'

vi.mock('@/lib/prisma', async () => {
  const { mockPrisma } = await import('../helpers/mock-prisma')
  return { prisma: mockPrisma }
})
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { searchSongsForAgent } from '@/lib/ai/song-search'
import { createSongAgentTools } from '@/lib/ai/song-agent-tools'
import { getServerSession } from 'next-auth'

describe('searchSongsForAgent', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('searches title, artist, and lyrics', async () => {
    mockPrisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: '奇妙的爱',
        artist: null,
        lyrics: '奇妙的爱…',
        tags: [{ tag: { name: '敬拜赞美', kind: 'TYPE' } }],
      },
    ])

    const songs = await searchSongsForAgent({ query: '奇妙' })

    expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { title: { contains: '奇妙', mode: 'insensitive' } },
            { artist: { contains: '奇妙', mode: 'insensitive' } },
            { lyrics: { contains: '奇妙', mode: 'insensitive' } },
          ],
        },
      })
    )
    expect(songs).toHaveLength(1)
    expect(songs[0]?.id).toBe('s1')
    expect(songs[0]?.lyricSnippet).toContain('奇妙')
  })

  it('filters by tag names with AND', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([
      { id: 't1' },
      { id: 't2' },
    ])
    mockPrisma.song.findMany.mockResolvedValue([])

    await searchSongsForAgent({
      tagNames: ['主日敬拜', '活泼'],
    })

    expect(mockPrisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tags: { some: { tagId: 't1' } } },
            { tags: { some: { tagId: 't2' } } },
          ],
        },
      })
    )
  })
})

describe('addSongToPlaylist tool', () => {
  beforeEach(() => {
    resetPrismaMock()
    vi.mocked(getServerSession).mockReset()
  })

  it('denies MEMBER role', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'MEMBER' },
    })

    const tools = createSongAgentTools()
    const result = await tools.addSongToPlaylist.execute!(
      { songId: 's1', playlistTitle: '主日' },
      { toolCallId: 'c1', messages: [], context: {} }
    )

    expect(result).toMatchObject({ ok: false })
    expect((result as { error: string }).error).toMatch(/权限/)
  })

  it('adds song when allowed', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'u1', role: 'LEADER' },
    })
    mockPrisma.playlist.findUnique.mockResolvedValue({ createdById: 'u1' })
    mockPrisma.song.findUnique.mockResolvedValue({ id: 's1', title: 'Song' })
    mockPrisma.playlistSong.findUnique.mockResolvedValue(null)
    mockPrisma.playlistSong.findFirst.mockResolvedValue({ order: 2 })
    mockPrisma.playlistSong.create.mockResolvedValue({})
    mockPrisma.playlist.findUnique
      .mockResolvedValueOnce({ createdById: 'u1' })
      .mockResolvedValueOnce({ title: '主日' })

    const tools = createSongAgentTools()
    const result = await tools.addSongToPlaylist.execute!(
      { songId: 's1', playlistId: 'p1' },
      { toolCallId: 'c1', messages: [], context: {} }
    )

    expect(result).toMatchObject({ ok: true, alreadyInPlaylist: false })
    expect(mockPrisma.playlistSong.create).toHaveBeenCalled()
  })
})
