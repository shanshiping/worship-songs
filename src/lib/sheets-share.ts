import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  type SheetsShareSection,
  SHEETS_SHARE_SECTIONS,
} from '@/lib/sheets-share-sections'

export {
  groupSongsBySection,
  isSheetsShareSection,
  SHEETS_SHARE_SECTIONS,
  type SheetsShareSection,
} from '@/lib/sheets-share-sections'

export const SHEETS_SHARE_SCHEMA_HINT =
  '分享功能需要最新数据库结构，请运行 pnpm exec prisma db push && pnpm exec prisma generate 后重启服务'

export function isSheetsShareSchemaReady(): boolean {
  return Boolean(
    prisma &&
      typeof prisma === 'object' &&
      'sheetsShare' in prisma &&
      prisma.sheetsShare &&
      typeof prisma.sheetsShare.create === 'function',
  )
}

export function assertSheetsShareSchemaReady(): void {
  if (!isSheetsShareSchemaReady()) {
    throw new Error('SHEETS_SHARE_SCHEMA_NOT_READY')
  }
}

export function isSheetsShareSchemaError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'SHEETS_SHARE_SCHEMA_NOT_READY') {
    return true
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022'
  }
  if (error && typeof error === 'object') {
    const name = 'name' in error ? String(error.name) : ''
    const message = 'message' in error ? String(error.message) : ''
    if (name === 'PrismaClientValidationError') {
      return (
        message.includes('sheetsShare') ||
        message.includes('SheetsShare') ||
        message.includes('arrangement') ||
        message.includes('section')
      )
    }
  }
  return false
}

export const SHEETS_SHARE_MAX_SONGS = 20

export function normalizeSheetsShareSongIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [
    ...new Set(
      raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
    ),
  ]
}

export function normalizeSheetsShareText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeSheetsShareSectionIds(input: {
  songIds?: unknown
  responseSongIds?: unknown
  communionSongIds?: unknown
}): Record<SheetsShareSection, string[]> {
  const main = normalizeSheetsShareSongIds(input.songIds)
  const mainSet = new Set(main)
  const response = normalizeSheetsShareSongIds(input.responseSongIds).filter(
    (id) => !mainSet.has(id),
  )
  const used = new Set([...main, ...response])
  const communion = normalizeSheetsShareSongIds(input.communionSongIds).filter(
    (id) => !used.has(id),
  )
  return { main, response, communion }
}

function buildSectionCreates(
  sectionIds: Record<SheetsShareSection, string[]>,
  foundIds: Set<string>,
) {
  const creates: Array<{ songId: string; order: number; section: SheetsShareSection }> = []

  for (const section of SHEETS_SHARE_SECTIONS) {
    const ids = sectionIds[section].filter((id) => foundIds.has(id))
    ids.forEach((songId, index) => {
      creates.push({ songId, order: index + 1, section })
    })
  }

  return creates
}

export function buildSheetsShareUrl(
  id: string,
  token: string,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
): string {
  return `${baseUrl}/share/sheets/${id}?token=${token}`
}

export const sheetsShareSongInclude = {
  tags: { include: { tag: true } },
  scriptures: { orderBy: { order: 'asc' as const } },
} as const

export async function createSheetsShare(input: {
  theme?: string | null
  scripture?: string | null
  arrangement?: string | null
  songIds?: unknown
  responseSongIds?: unknown
  communionSongIds?: unknown
  createdById?: string | null
}) {
  const sectionIds = normalizeSheetsShareSectionIds(input)
  const allIds = [...sectionIds.main, ...sectionIds.response, ...sectionIds.communion]

  if (sectionIds.main.length === 0 && sectionIds.response.length === 0) {
    throw new Error('请选择至少一首歌曲')
  }
  if (allIds.length > SHEETS_SHARE_MAX_SONGS) {
    throw new Error(`最多选择 ${SHEETS_SHARE_MAX_SONGS} 首歌曲`)
  }

  const found = await prisma.song.findMany({
    where: { id: { in: allIds } },
    select: { id: true },
  })
  if (found.length === 0) {
    throw new Error('未找到所选歌曲')
  }

  const foundIds = new Set(found.map((song) => song.id))
  const creates = buildSectionCreates(sectionIds, foundIds)
  if (creates.length === 0) {
    throw new Error('未找到所选歌曲')
  }

  assertSheetsShareSchemaReady()

  const token = randomBytes(32).toString('hex')

  const share = await prisma.sheetsShare.create({
    data: {
      theme: normalizeSheetsShareText(input.theme),
      scripture: normalizeSheetsShareText(input.scripture),
      arrangement: normalizeSheetsShareText(input.arrangement),
      createdById: input.createdById ?? null,
      songs: {
        create: creates,
      },
    },
    select: { id: true },
  })

  return {
    id: share.id,
    token,
    url: buildSheetsShareUrl(share.id, token),
  }
}

export async function getSheetsSharePublic(id: string) {
  assertSheetsShareSchemaReady()

  return prisma.sheetsShare.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      songs: {
        include: {
          song: {
            include: sheetsShareSongInclude,
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })
}
