import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
        message.includes('arrangement')
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
  songIds: string[]
  createdById?: string | null
}) {
  const songIds = normalizeSheetsShareSongIds(input.songIds)
  if (songIds.length === 0) {
    throw new Error('请选择至少一首歌曲')
  }
  if (songIds.length > SHEETS_SHARE_MAX_SONGS) {
    throw new Error(`最多选择 ${SHEETS_SHARE_MAX_SONGS} 首歌曲`)
  }

  const found = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true },
  })
  if (found.length === 0) {
    throw new Error('未找到所选歌曲')
  }

  const foundIds = new Set(found.map((song) => song.id))
  const orderedIds = songIds.filter((id) => foundIds.has(id))
  if (orderedIds.length === 0) {
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
        create: orderedIds.map((songId, index) => ({
          songId,
          order: index + 1,
        })),
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
