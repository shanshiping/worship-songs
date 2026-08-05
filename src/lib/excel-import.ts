import type { Meeting, PrismaClient } from '@prisma/client'
import { parseSongNames } from '@/lib/excel-song-names'

export const DEFAULT_MEETING_TYPE = 'MORNING'

export interface ParsedMeetingRow {
  date: Date
  theme: string | null
  speaker: string | null
  leader: string | null
  songNames: string[]
  rowIndex: number
}

export interface AggregatedMeeting {
  date: Date
  theme: string | null
  speaker: string | null
  leader: string | null
  songNames: string[]
}

export interface ImportStats {
  songs: number
  meetings: number
  meetingsUpdated: number
  errors: string[]
  skipped: number
}

export function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000)
}

export function parseImportDate(value: unknown): Date | null {
  if (value == null || value === '') return null

  let date: Date
  if (typeof value === 'number') {
    date = excelSerialToDate(value)
  } else if (typeof value === 'string') {
    date = new Date(value.trim())
  } else {
    return null
  }

  return Number.isNaN(date.getTime()) ? null : date
}

export function getCalendarDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function normalizeThemeForMatch(theme: string | null | undefined): string {
  if (!theme) return ''
  return theme.replace(/[\n\r]+/g, ' ').trim()
}

export function buildMeetingKey(date: Date, theme: string | null): string {
  const dateStr = date.toISOString().split('T')[0]
  const themeKey = normalizeThemeForMatch(theme) || 'default'
  return `${dateStr}_${themeKey}`
}

export function normalizePersonName(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === '？' || trimmed === '?') return null
  return trimmed
}

export function pickExistingMeeting(
  candidates: Pick<Meeting, 'id' | 'theme' | 'type'>[],
  theme: string | null,
  type = DEFAULT_MEETING_TYPE,
): Pick<Meeting, 'id' | 'theme' | 'type'> | null {
  const sameType = candidates.filter((meeting) => meeting.type === type)
  if (sameType.length === 0) return null
  if (sameType.length === 1) return sameType[0]

  const normalizedTheme = normalizeThemeForMatch(theme)
  if (normalizedTheme) {
    const themeMatch = sameType.find(
      (meeting) => normalizeThemeForMatch(meeting.theme) === normalizedTheme,
    )
    if (themeMatch) return themeMatch
  }

  return sameType[0]
}

export function aggregateMeetingRows(rows: ParsedMeetingRow[]): AggregatedMeeting[] {
  const map = new Map<string, AggregatedMeeting>()

  for (const row of rows) {
    const key = buildMeetingKey(row.date, row.theme)
    let aggregated = map.get(key)

    if (!aggregated) {
      aggregated = {
        date: row.date,
        theme: row.theme,
        speaker: row.speaker,
        leader: row.leader,
        songNames: [],
      }
      map.set(key, aggregated)
    } else {
      if (row.speaker) aggregated.speaker = row.speaker
      if (row.leader) aggregated.leader = row.leader
    }

    const seen = new Set(aggregated.songNames)
    for (const title of row.songNames) {
      if (!seen.has(title)) {
        seen.add(title)
        aggregated.songNames.push(title)
      }
    }
  }

  return Array.from(map.values())
}

export function parseMeetingRow(
  row: unknown[],
  rowIndex: number,
  columns: {
    dateIndex: number
    themeIndex: number
    speakerIndex: number
    leaderIndex: number
    songStartIndex: number
  },
): ParsedMeetingRow | null {
  const { dateIndex, themeIndex, speakerIndex, leaderIndex, songStartIndex } = columns
  if (!row || !row[dateIndex]) return null

  const date = parseImportDate(row[dateIndex])
  if (!date) return null

  const theme =
    themeIndex >= 0 ? normalizeThemeForMatch(String(row[themeIndex] || '')) || null : null
  const speaker = normalizePersonName(
    speakerIndex >= 0 ? String(row[speakerIndex] || '') : null,
  )
  const leader = normalizePersonName(
    leaderIndex >= 0 ? String(row[leaderIndex] || '') : null,
  )

  const seenTitles = new Set<string>()
  const songNames: string[] = []
  for (let j = songStartIndex; j < row.length; j++) {
    const cellValue = String(row[j] || '').trim()
    if (!cellValue) continue

    for (const title of parseSongNames(cellValue)) {
      if (!seenTitles.has(title)) {
        seenTitles.add(title)
        songNames.push(title)
      }
    }
  }

  if (songNames.length === 0) return null

  return {
    date,
    theme,
    speaker,
    leader,
    songNames,
    rowIndex,
  }
}

export async function findExistingMeeting(
  prisma: Pick<PrismaClient, 'meeting'>,
  date: Date,
  theme: string | null,
  type = DEFAULT_MEETING_TYPE,
): Promise<Pick<Meeting, 'id' | 'theme' | 'type'> | null> {
  const { start, end } = getCalendarDayBounds(date)
  const candidates = await prisma.meeting.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    select: { id: true, theme: true, type: true },
  })

  return pickExistingMeeting(candidates, theme, type)
}

export async function upsertMeetingWithSongs(
  prisma: Pick<PrismaClient, 'meeting' | 'song' | 'meetingSong'>,
  meetingData: AggregatedMeeting,
  stats: ImportStats,
): Promise<void> {
  const existing = await findExistingMeeting(prisma, meetingData.date, meetingData.theme)

  let meetingId: string
  if (existing) {
    await prisma.meeting.update({
      where: { id: existing.id },
      data: {
        theme: meetingData.theme ?? existing.theme,
        speaker: meetingData.speaker ?? undefined,
        leader: meetingData.leader ?? undefined,
      },
    })
    meetingId = existing.id
    stats.meetingsUpdated++
  } else {
    const created = await prisma.meeting.create({
      data: {
        date: meetingData.date,
        theme: meetingData.theme,
        speaker: meetingData.speaker,
        leader: meetingData.leader,
        type: DEFAULT_MEETING_TYPE,
      },
    })
    meetingId = created.id
    stats.meetings++
  }

  for (let order = 0; order < meetingData.songNames.length; order++) {
    const songTitle = meetingData.songNames[order]
    if (!songTitle) continue

    let song = await prisma.song.findFirst({
      where: { title: songTitle },
    })

    if (!song) {
      song = await prisma.song.create({
        data: { title: songTitle },
      })
      stats.songs++
    }

    await prisma.meetingSong.upsert({
      where: {
        meetingId_songId: {
          meetingId,
          songId: song.id,
        },
      },
      create: {
        meetingId,
        songId: song.id,
        order: order + 1,
      },
      update: {
        order: order + 1,
      },
    })
  }
}
