import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

function songTagInclude() {
  return {
    tags: {
      include: { tag: true },
    },
  } as const
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tagIds = [
      ...new Set(
        searchParams
          .getAll('tagIds')
          .flatMap((v) => v.split(','))
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ]

    const where: Prisma.SongWhereInput = {}

    if (tagIds.length > 0) {
      where.AND = tagIds.map((tagId) => ({
        tags: { some: { tagId } },
      }))
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: {
          ...songTagInclude(),
          _count: {
            select: { meetings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.song.count({ where }),
    ])

    return NextResponse.json({
      songs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Songs API error:', error)
    return NextResponse.json(
      { error: '获取歌曲列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      artist,
      tagIds: rawTagIds,
      key,
      timeSignature,
      composer,
      lyricist,
      team,
      album,
      mvUrl,
      sheetMusic,
      audioFile,
      lyrics,
      notes,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: '歌曲名称为必填项' },
        { status: 400 }
      )
    }

    const tagIds = parseTagIds(rawTagIds)

    const normalizedMvUrl = normalizeOptional(mvUrl)
    if (normalizedMvUrl && !isValidHttpUrl(normalizedMvUrl)) {
      return NextResponse.json({ error: 'MV 链接格式不正确' }, { status: 400 })
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist: normalizeOptional(artist),
        key: normalizeOptional(key),
        timeSignature: normalizeOptional(timeSignature),
        composer: normalizeOptional(composer),
        lyricist: normalizeOptional(lyricist),
        team: normalizeOptional(team),
        album: normalizeOptional(album),
        mvUrl: normalizedMvUrl,
        sheetMusic: normalizeOptional(sheetMusic),
        audioFile: normalizeOptional(audioFile),
        lyrics: normalizeOptional(lyrics),
        notes: normalizeOptional(notes),
        tags:
          tagIds.length > 0
            ? {
                create: tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
      },
      include: songTagInclude(),
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    console.error('Create song error:', error)
    return NextResponse.json(
      { error: '创建歌曲失败' },
      { status: 500 }
    )
  }
}
