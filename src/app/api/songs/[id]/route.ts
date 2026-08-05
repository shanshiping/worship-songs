import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { resolveLyricsWithAutoExtract } from '@/lib/sheet-lyrics'
import {
  getSongSheetPaths,
  parseSheetMusicPagesInput,
  sheetFieldsFromPages,
} from '@/lib/song-sheet-paths'
import { normalizeSongTitle } from '@/lib/song-title-normalize'
import { titleInitialFieldsForTitle } from '@/lib/song-title-initial-sync'
import {
  normalizeOptional,
  isValidHttpUrl,
  parseTagIds,
  parseScriptures,
} from '../route'

async function getSongMeetings(songId: string) {
  const meetingSongs = await prisma.meetingSong.findMany({
    where: { songId },
    include: {
      meeting: true,
    },
  })

  return meetingSongs.map((meetingSong) => ({
    meeting: meetingSong.meeting,
  }))
}

const songDetailInclude = {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const song = await prisma.song.findUnique({
      where: { id },
      include: songDetailInclude,
    })

    if (!song) {
      return NextResponse.json(
        { error: '歌曲不存在' },
        { status: 404 }
      )
    }

    let meetings: Awaited<ReturnType<typeof getSongMeetings>> = []
    try {
      meetings = await getSongMeetings(id)
    } catch (e) {
      console.error('Get meetings error:', e)
    }

    return NextResponse.json({
      ...song,
      meetings,
    })
  } catch (error) {
    console.error('Get song error:', error)
    return NextResponse.json(
      { error: '获取歌曲详情失败' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
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

    const normalizedTitle = normalizeSongTitle(title ?? '')
    if (!normalizedTitle) {
      return NextResponse.json({ error: '歌曲名称无效' }, { status: 400 })
    }

    const initialFields = titleInitialFieldsForTitle(normalizedTitle)

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

    const tagIds = parseTagIds(rawTagIds)
    const scripturesResult = parseScriptures(rawScriptures)
    if (!scripturesResult.ok) {
      return NextResponse.json({ error: scripturesResult.error }, { status: 400 })
    }

    const sheetPages = parseSheetMusicPagesInput(rawSheetMusicPages, sheetMusic)
    const { sheetMusic: normalizedSheet, sheetMusicPages } = sheetFieldsFromPages(sheetPages)

    const existing = await prisma.song.findUnique({
      where: { id },
      select: { sheetMusic: true, sheetMusicPages: true },
    })

    if (!existing) {
      return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
    }

    const existingPages = getSongSheetPaths(existing)
    const sheetChanged =
      existingPages.length !== sheetPages.length ||
      existingPages.some((path, index) => path !== sheetPages[index])
    const sheetAddedOrReplaced = sheetChanged && normalizedSheet !== null
    const sheetRemoved = sheetChanged && normalizedSheet === null
    const userId = session?.user?.id

    const shouldAutoExtract =
      !normalizeOptional(lyrics) &&
      normalizedSheet !== null &&
      (sheetAddedOrReplaced || !(existing.sheetMusic ?? null))

    const resolvedLyrics = shouldAutoExtract
      ? await resolveLyricsWithAutoExtract(normalizedSheet, lyrics)
      : normalizeOptional(lyrics)

    await prisma.songTag.deleteMany({ where: { songId: id } })
    await prisma.songScripture.deleteMany({ where: { songId: id } })

    const song = await prisma.song.update({
      where: { id },
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
        sheetMusicPages: sheetMusicPages.length > 0 ? sheetMusicPages : null,
        audioFile: normalizeOptional(audioFile),
        lyrics: resolvedLyrics,
        lyricsLrc: normalizeOptional(lyricsLrc),
        notes: normalizeOptional(notes),
        ...(sheetAddedOrReplaced && userId
          ? {
              sheetUploadedById: userId,
              sheetUploadedAt: new Date(),
            }
          : {}),
        ...(sheetRemoved
          ? {
              sheetUploadedById: null,
              sheetUploadedAt: null,
            }
          : {}),
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
        scriptures: {
          create: scripturesResult.data.map((s, order) => ({
            reference: s.reference,
            text: s.text,
            order,
          })),
        },
      },
      include: songDetailInclude,
    })

    return NextResponse.json(song)
  } catch (error: unknown) {
    console.error('Update song error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '更新歌曲失败') },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.meetingSong.deleteMany({
      where: { songId: id },
    })

    await prisma.playlistSong.deleteMany({
      where: { songId: id },
    })

    await prisma.songTag.deleteMany({
      where: { songId: id },
    })

    await prisma.songScripture.deleteMany({
      where: { songId: id },
    })

    await prisma.song.delete({
      where: { id },
    })

    return NextResponse.json({ message: '歌曲已删除' })
  } catch (error: unknown) {
    console.error('Delete song error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '删除歌曲失败') },
      { status: 500 }
    )
  }
}
