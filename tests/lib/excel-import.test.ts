import { beforeEach, describe, expect, it } from 'vitest'
import { mockPrisma, resetPrismaMock } from '../helpers/mock-prisma'
import {
  aggregateMeetingRows,
  buildMeetingKey,
  findExistingMeeting,
  getCalendarDayBounds,
  parseImportDate,
  parseMeetingRow,
  pickExistingMeeting,
  upsertMeetingWithSongs,
} from '@/lib/excel-import'

describe('excel-import', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  describe('parseImportDate', () => {
    it('parses Excel serial numbers', () => {
      const date = parseImportDate(45306)
      expect(date).not.toBeNull()
      expect(date!.toISOString().slice(0, 10)).toBe('2024-01-15')
    })

    it('parses date strings', () => {
      const date = parseImportDate('2026-01-15')
      expect(date).not.toBeNull()
      expect(date!.getFullYear()).toBe(2026)
    })

    it('returns null for invalid values', () => {
      expect(parseImportDate('')).toBeNull()
      expect(parseImportDate('invalid')).toBeNull()
    })
  })

  describe('buildMeetingKey', () => {
    it('combines date and theme', () => {
      const key = buildMeetingKey(new Date('2026-01-15T00:00:00.000Z'), '复活节')
      expect(key).toBe('2026-01-15_复活节')
    })

    it('uses default when theme is empty', () => {
      const key = buildMeetingKey(new Date('2026-01-15T00:00:00.000Z'), null)
      expect(key).toBe('2026-01-15_default')
    })
  })

  describe('pickExistingMeeting', () => {
    it('returns the only candidate on the same day', () => {
      const candidates = [{ id: 'm1', theme: '主题', type: 'MORNING' }]
      expect(pickExistingMeeting(candidates, '其他主题')).toEqual(candidates[0])
    })

    it('matches by theme when multiple meetings share a date', () => {
      const candidates = [
        { id: 'm1', theme: '早堂', type: 'MORNING' },
        { id: 'm2', theme: '晚堂', type: 'MORNING' },
      ]
      expect(pickExistingMeeting(candidates, '晚堂')).toEqual(candidates[1])
    })

    it('returns null when no candidate matches the type', () => {
      const candidates = [{ id: 'm1', theme: '主题', type: 'EVENING' }]
      expect(pickExistingMeeting(candidates, '主题', 'MORNING')).toBeNull()
    })
  })

  describe('aggregateMeetingRows', () => {
    it('merges rows with the same date and theme', () => {
      const date = new Date('2026-01-15T00:00:00.000Z')
      const aggregated = aggregateMeetingRows([
        {
          date,
          theme: '主题',
          speaker: '张弟兄',
          leader: null,
          songNames: ['神掌权'],
          rowIndex: 2,
        },
        {
          date,
          theme: '主题',
          speaker: null,
          leader: '李姊妹',
          songNames: ['奇异恩典', '神掌权'],
          rowIndex: 3,
        },
      ])

      expect(aggregated).toHaveLength(1)
      expect(aggregated[0].speaker).toBe('张弟兄')
      expect(aggregated[0].leader).toBe('李姊妹')
      expect(aggregated[0].songNames).toEqual(['神掌权', '奇异恩典'])
    })
  })

  describe('parseMeetingRow', () => {
    it('skips rows without songs', () => {
      const parsed = parseMeetingRow(
        ['2026-01-15', '主题', '', '', '无聚会'],
        2,
        {
          dateIndex: 0,
          themeIndex: 1,
          speakerIndex: 2,
          leaderIndex: 3,
          songStartIndex: 4,
        },
      )
      expect(parsed).toBeNull()
    })
  })

  describe('findExistingMeeting', () => {
    it('queries meetings within the calendar day', async () => {
      const date = new Date('2026-01-15T12:00:00.000Z')
      mockPrisma.meeting.findMany.mockResolvedValue([
        { id: 'm1', theme: '主题', type: 'MORNING' },
      ])

      const found = await findExistingMeeting(mockPrisma, date, '主题')
      expect(found?.id).toBe('m1')

      const { start, end } = getCalendarDayBounds(date)
      expect(mockPrisma.meeting.findMany).toHaveBeenCalledWith({
        where: { date: { gte: start, lte: end } },
        select: { id: true, theme: true, type: true },
      })
    })
  })

  describe.sequential('upsertMeetingWithSongs', () => {
    it('updates an existing meeting instead of creating a duplicate', async () => {
      const stats = {
        songs: 0,
        meetings: 0,
        meetingsUpdated: 0,
        errors: [],
        skipped: 0,
      }

      mockPrisma.meeting.findMany.mockResolvedValue([
        { id: 'm1', theme: '旧主题', type: 'MORNING' },
      ])
      mockPrisma.meeting.update.mockResolvedValue({ id: 'm1' })
      mockPrisma.song.findFirst.mockResolvedValue({ id: 's1', title: '神掌权' })
      mockPrisma.meetingSong.upsert.mockResolvedValue({})

      await upsertMeetingWithSongs(
        mockPrisma,
        {
          date: new Date('2026-01-15T00:00:00.000Z'),
          theme: '新主题',
          speaker: '张弟兄',
          leader: null,
          songNames: ['神掌权'],
        },
        stats,
      )

      expect(mockPrisma.meeting.create).not.toHaveBeenCalled()
      expect(mockPrisma.meeting.update).toHaveBeenCalled()
      expect(stats.meetingsUpdated).toBe(1)
      expect(stats.meetings).toBe(0)
    })

    it('creates a meeting when none exists for the date', async () => {
      const stats = {
        songs: 0,
        meetings: 0,
        meetingsUpdated: 0,
        errors: [],
        skipped: 0,
      }

      mockPrisma.meeting.findMany.mockResolvedValue([])
      mockPrisma.meeting.create.mockResolvedValue({ id: 'm-new' })
      mockPrisma.song.findFirst.mockResolvedValue(null)
      mockPrisma.song.create.mockResolvedValue({ id: 's-new', title: '神掌权' })
      mockPrisma.meetingSong.upsert.mockResolvedValue({})

      await upsertMeetingWithSongs(
        mockPrisma,
        {
          date: new Date('2026-01-15T00:00:00.000Z'),
          theme: '主题',
          speaker: null,
          leader: null,
          songNames: ['神掌权'],
        },
        stats,
      )

      expect(mockPrisma.meeting.create).toHaveBeenCalled()
      expect(mockPrisma.meeting.update).not.toHaveBeenCalled()
      expect(stats.meetings).toBe(1)
      expect(stats.songs).toBe(1)
    })
  })
})
