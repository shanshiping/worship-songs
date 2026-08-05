import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveLyricsWithAutoExtract } from '@/lib/sheet-lyrics'
import {
  parseSheetMusicPagesInput,
  sheetFieldsFromPages,
} from '@/lib/song-sheet-paths'
import { normalizeSongTitle } from '@/lib/song-title-normalize'
import {
  isInitialFieldSchemaError,
  parseSongLetterParam,
  songListOrderByFallback,
  songListOrderByPreferred,
  syncStaleSongTitleInitials,
  titleInitialFieldsForTitle,
  loadSongsForInitialIndex,
} from '@/lib/song-title-initial-sync'
import {
  buildSongKeyWhere,
  parseSongKeyParamsFromSearchParams,
} from '@/lib/song-key-filter'

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
    const letter = parseSongLetterParam(searchParams.get('letter'))
    const keys = parseSongKeyParamsFromSearchParams(searchParams)
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

    if (letter) {
      and.push({ titleInitial: letter })
    }

    const keyWhere = buildSongKeyWhere(keys)
    if (keyWhere) {
      and.push(keyWhere)
    }

    const where: Prisma.SongWhereInput =
      and.length === 0 ? {} : and.length === 1 ? and[0]! : { AND: and }

    const include = {
      ...songDetailInclude(),
      _count: {
        select: { meetings: true },
      },
    }

    let songs
    let total
    let usedInitialFallback = false
    try {
      ;[songs, total] = await Promise.all([
        prisma.song.findMany({
          where,
          include,
          orderBy: songListOrderByPreferred,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.song.count({ where }),
      ])
    } catch (error) {
      if (!isInitialFieldSchemaError(error)) throw error
      usedInitialFallback = true
      const fallbackAnd = and.filter((clause) => !('titleInitial' in (clause as object)))
      const fallbackWhere: Prisma.SongWhereInput =
        fallbackAnd.length === 0
          ? {}
          : fallbackAnd.length === 1
            ? fallbackAnd[0]!
            : { AND: fallbackAnd }
      ;[songs, total] = await Promise.all([
        prisma.song.findMany({
          where: fallbackWhere,
          include,
          orderBy: songListOrderByFallback,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.song.count({ where: fallbackWhere }),
      ])
    }

    if (letter && usedInitialFallback) {
      const allTitles = await prisma.song.findMany({ select: { id: true, title: true } })
      const matchingIds = allTitles
        .filter((song) => titleInitialFieldsForTitle(song.title).titleInitial === letter)
        .map((song) => song.id)
      const start = (page - 1) * limit
      const pageIds = matchingIds.slice(start, start + limit)
      if (pageIds.length > 0) {
        const fetched = await prisma.song.findMany({
          where: { id: { in: pageIds } },
          include,
          orderBy: songListOrderByFallback,
        })
        const order = new Map(pageIds.map((id, index) => [id, index]))
        songs = fetched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      } else {
        songs = []
      }
      total = matchingIds.length
    }

    if (letter) {
      void loadSongsForInitialIndex(prisma)
        .then((rows) => syncStaleSongTitleInitials(prisma, rows))
        .catch((error) => console.error('Background song initial sync failed:', error))
    }

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
      listenUrl,
      sheetLinkUrl,
      coverImage,
      pptBackground,
      sheetMusic,
      sheetMusicPages: rawSheetMusicPages,
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

    const normalizedTitle = normalizeSongTitle(title)
    if (!normalizedTitle) {
      return NextResponse.json(
        { error: '歌曲名称无效' },
        { status: 400 }
      )
    }

    const initialFields = titleInitialFieldsForTitle(normalizedTitle)

    const tagIds = parseTagIds(rawTagIds)
    const scripturesResult = parseScriptures(rawScriptures)
    if (!scripturesResult.ok) {
      return NextResponse.json({ error: scripturesResult.error }, { status: 400 })
    }

    const normalizedMvUrl = normalizeOptional(mvUrl)
    if (normalizedMvUrl && !isValidHttpUrl(normalizedMvUrl)) {
      return NextResponse.json({ error: 'MV 链接格式不正确' }, { status: 400 })
    }

    const normalizedListenUrl = normalizeOptional(listenUrl)
    if (normalizedListenUrl && !isValidHttpUrl(normalizedListenUrl)) {
      return NextResponse.json({ error: '试听链接格式不正确' }, { status: 400 })
    }

    const normalizedSheetLinkUrl = normalizeOptional(sheetLinkUrl)
    if (normalizedSheetLinkUrl && !isValidHttpUrl(normalizedSheetLinkUrl)) {
      return NextResponse.json({ error: '歌谱链接格式不正确' }, { status: 400 })
    }

    const sheetPages = parseSheetMusicPagesInput(rawSheetMusicPages, sheetMusic)
    const { sheetMusic: normalizedSheet, sheetMusicPages } = sheetFieldsFromPages(sheetPages)
    const userId = session.user.id

    const resolvedLyrics = await resolveLyricsWithAutoExtract(
      normalizedSheet,
      lyrics,
    )

    const song = await prisma.song.create({
      data: {
        title: normalizedTitle,
        ...initialFields,
        artist: normalizeOptional(artist),
        key: normalizeOptional(key),
        timeSignature: normalizeOptional(timeSignature),
        composer: normalizeOptional(composer),
        lyricist: normalizeOptional(lyricist),
        team: normalizeOptional(team),
        album: normalizeOptional(album),
        mvUrl: normalizedMvUrl,
        listenUrl: normalizedListenUrl,
        sheetLinkUrl: normalizedSheetLinkUrl,
        coverImage: normalizeOptional(coverImage),
        pptBackground: normalizeOptional(pptBackground),
        sheetMusic: normalizedSheet,
        sheetMusicPages: sheetMusicPages.length > 0 ? sheetMusicPages : undefined,
        audioFile: normalizeOptional(audioFile),
        lyrics: resolvedLyrics,
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
