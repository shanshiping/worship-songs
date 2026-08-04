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

export type ScriptureInput = { reference: string; text: string | null }

export function parseScriptures(
  value: unknown
): { ok: true; data: ScriptureInput[] } | { ok: false; error: string } {
  if (value === undefined || value === null || !Array.isArray(value)) {
    return { ok: true, data: [] }
  }

  const data: ScriptureInput[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: '经文出处不能为空' }
    }
    const raw = item as { reference?: unknown; text?: unknown }
    const reference =
      typeof raw.reference === 'string' ? raw.reference.trim() : ''
    if (!reference) {
      return { ok: false, error: '经文出处不能为空' }
    }
    data.push({
      reference,
      text: normalizeOptional(raw.text),
    })
  }
  return { ok: true, data }
}

function songDetailInclude() {
  return {
    tags: {
      include: { tag: true },
    },
    scriptures: {
      orderBy: { order: 'asc' as const },
    },
    uploadedBy: {
      select: { id: true, name: true, email: true },
    },
    sheetUploadedBy: {
      select: { id: true, name: true, email: true },
    },
  } as const
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const lyricsSearch = searchParams.get('lyricsSearch')
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

    const and: Prisma.SongWhereInput[] = []

    if (tagIds.length > 0) {
      and.push(
        ...tagIds.map((tagId) => ({
          tags: { some: { tagId } },
        }))
      )
    }

    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { artist: { contains: search, mode: 'insensitive' as const } },
          {
            scriptures: {
              some: {
                reference: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        ],
      })
    }

    if (lyricsSearch) {
      and.push({
        lyrics: { contains: lyricsSearch, mode: 'insensitive' as const },
      })
    }

    const where: Prisma.SongWhereInput =
      and.length === 0 ? {} : and.length === 1 ? and[0]! : { AND: and }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: {
          ...songDetailInclude(),
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
    if (!session?.user?.id) {
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
      coverImage,
      sheetMusic,
      audioFile,
      lyrics,
      lyricsLrc,
      notes,
      scriptures: rawScriptures,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: '歌曲名称为必填项' },
        { status: 400 }
      )
    }

    const tagIds = parseTagIds(rawTagIds)
    const scripturesResult = parseScriptures(rawScriptures)
    if (!scripturesResult.ok) {
      return NextResponse.json({ error: scripturesResult.error }, { status: 400 })
    }

    const normalizedMvUrl = normalizeOptional(mvUrl)
    if (normalizedMvUrl && !isValidHttpUrl(normalizedMvUrl)) {
      return NextResponse.json({ error: 'MV 链接格式不正确' }, { status: 400 })
    }

    const normalizedSheet = normalizeOptional(sheetMusic)
    const userId = session.user.id

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
        coverImage: normalizeOptional(coverImage),
        sheetMusic: normalizedSheet,
        audioFile: normalizeOptional(audioFile),
        lyrics: normalizeOptional(lyrics),
        lyricsLrc: normalizeOptional(lyricsLrc),
        notes: normalizeOptional(notes),
        uploadedById: userId,
        sheetUploadedById: normalizedSheet ? userId : null,
        sheetUploadedAt: normalizedSheet ? new Date() : null,
        tags:
          tagIds.length > 0
            ? {
                create: tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        scriptures:
          scripturesResult.data.length > 0
            ? {
                create: scripturesResult.data.map((s, order) => ({
                  reference: s.reference,
                  text: s.text,
                  order,
                })),
              }
            : undefined,
      },
      include: songDetailInclude(),
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
