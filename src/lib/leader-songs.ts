export type LeaderSongInput = {
  leader: string
  meetingId: string
  songId: string
  song: {
    id: string
    title: string
    artist: string | null
  }
}

export type LeaderSongStatItem = {
  rank: number
  id: string
  title: string
  artist: string | null
  count: number
}

export type LeaderSongStats = {
  leader: string
  meetingCount: number
  songs: LeaderSongStatItem[]
}

type BuildLeaderSongStatsOptions = {
  leader?: string
  limitPerLeader?: number
}

export function buildLeaderSongStats(
  rows: LeaderSongInput[],
  options: BuildLeaderSongStatsOptions = {}
): LeaderSongStats[] {
  const limit = options.limitPerLeader ?? 10
  const leaderFilter = options.leader?.trim()

  const filtered = rows.filter((row) => {
    const name = row.leader?.trim()
    if (!name) return false
    if (leaderFilter) return name === leaderFilter
    return true
  })

  const byLeader = new Map<
    string,
    {
      meetings: Set<string>
      songs: Map<string, { song: LeaderSongInput['song']; count: number }>
    }
  >()

  for (const row of filtered) {
    const leader = row.leader.trim()
    if (!byLeader.has(leader)) {
      byLeader.set(leader, { meetings: new Set(), songs: new Map() })
    }
    const entry = byLeader.get(leader)!
    entry.meetings.add(row.meetingId)

    const existing = entry.songs.get(row.songId)
    if (existing) {
      existing.count += 1
    } else {
      entry.songs.set(row.songId, { song: row.song, count: 1 })
    }
  }

  return [...byLeader.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([leader, data]) => ({
      leader,
      meetingCount: data.meetings.size,
      songs: [...data.songs.values()]
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.song.title.localeCompare(b.song.title, 'zh-CN')
        )
        .slice(0, limit)
        .map((item, index) => ({
          rank: index + 1,
          id: item.song.id,
          title: item.song.title,
          artist: item.song.artist,
          count: item.count,
        })),
    }))
}
