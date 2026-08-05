import { leaderMatchesFilter, normalizeLeaderName } from '@/lib/leader-names'

export type LeaderSongInput = {
  leader: string
  meetingId: string
  meetingDate: Date | string
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
  totalSongCount: number
  songs: LeaderSongStatItem[]
}

type BuildLeaderSongStatsOptions = {
  leader?: string
  /** When set, caps returned songs (omit to return all). */
  limitPerLeader?: number
}

export const LEADER_STATS_DEFAULT_DISPLAY = 10

function meetingTimestamp(date: Date | string): number {
  const ts = new Date(date).getTime()
  return Number.isFinite(ts) ? ts : 0
}

/** Sort leader names by most recent meeting date (newest first). */
export function sortLeadersByRecentAppearance(
  meetings: Array<{ leader: string | null; date: Date | string }>,
): string[] {
  const latestByLeader = new Map<string, number>()

  for (const row of meetings) {
    const name = normalizeLeaderName(row.leader)
    if (!name) continue
    const ts = meetingTimestamp(row.date)
    const prev = latestByLeader.get(name) ?? 0
    if (ts > prev) latestByLeader.set(name, ts)
  }

  return [...latestByLeader.entries()]
    .sort(
      ([aName, aTs], [bName, bTs]) =>
        bTs - aTs || aName.localeCompare(bName, 'zh-CN'),
    )
    .map(([name]) => name)
}

export function buildLeaderSongStats(
  rows: LeaderSongInput[],
  options: BuildLeaderSongStatsOptions = {}
): LeaderSongStats[] {
  const limit = options.limitPerLeader
  const leaderFilter = options.leader?.trim()

  const filtered = rows.filter((row) => {
    const name = row.leader?.trim()
    if (!name) return false
    if (leaderFilter) return leaderMatchesFilter(name, leaderFilter)
    return true
  })

  const byLeader = new Map<
    string,
    {
      meetings: Set<string>
      latestMeetingDate: number
      songs: Map<string, { song: LeaderSongInput['song']; count: number }>
    }
  >()

  for (const row of filtered) {
    const leader = normalizeLeaderName(row.leader.trim())
    if (!leader) continue

    if (!byLeader.has(leader)) {
      byLeader.set(leader, {
        meetings: new Set(),
        latestMeetingDate: 0,
        songs: new Map(),
      })
    }
    const entry = byLeader.get(leader)!
    entry.meetings.add(row.meetingId)
    entry.latestMeetingDate = Math.max(
      entry.latestMeetingDate,
      meetingTimestamp(row.meetingDate),
    )

    const existing = entry.songs.get(row.songId)
    if (existing) {
      existing.count += 1
    } else {
      entry.songs.set(row.songId, { song: row.song, count: 1 })
    }
  }

  return [...byLeader.entries()]
    .sort(
      ([aName, aData], [bName, bData]) =>
        bData.latestMeetingDate - aData.latestMeetingDate ||
        aName.localeCompare(bName, 'zh-CN'),
    )
    .map(([leader, data]) => {
      const ranked = [...data.songs.values()].sort(
        (a, b) =>
          b.count - a.count ||
          a.song.title.localeCompare(b.song.title, 'zh-CN'),
      )
      const sliced =
        typeof limit === 'number' && limit > 0 ? ranked.slice(0, limit) : ranked

      return {
        leader,
        meetingCount: data.meetings.size,
        totalSongCount: ranked.length,
        songs: sliced.map((item, index) => ({
          rank: index + 1,
          id: item.song.id,
          title: item.song.title,
          artist: item.song.artist,
          count: item.count,
        })),
      }
    })
}
