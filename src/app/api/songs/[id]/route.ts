import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { normalizeOptional, isValidHttpUrl, parseTagIds } from '../route'

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
      coverImage,
      sheetMusic,
      audioFile,
      lyrics,
      lyricsLrc,
      notes,
    } = body

    const normalizedMvUrl = normalizeOptional(mvUrl)
    if (normalizedMvUrl && !isValidHttpUrl(normalizedMvUrl)) {
      return NextResponse.json({ error: 'MV 链接格式不正确' }, { status: 400 })
    }

    const tagIds = parseTagIds(rawTagIds)
    const normalizedSheet = normalizeOptional(sheetMusic)

    const existing = await prisma.song.findUnique({
      where: { id },
      select: { sheetMusic: true },
    })

    if (!existing) {
      return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
    }

    const sheetChanged = normalizedSheet !== (existing.sheetMusic ?? null)
    const sheetAddedOrReplaced = sheetChanged && normalizedSheet !== null
    const sheetRemoved = sheetChanged && normalizedSheet === null
    const userId = session?.user?.id

    await prisma.songTag.deleteMany({ where: { songId: id } })

    const song = await prisma.song.update({
      where: { id },
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
