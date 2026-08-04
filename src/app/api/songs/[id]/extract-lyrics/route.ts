import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getLyricsOcrConfigError,
  isLyricsOcrConfigured,
} from '@/lib/lyrics-ocr-config'
import { tryExtractLyricsFromSheetPath } from '@/lib/sheet-lyrics'

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    if (!isLyricsOcrConfigured()) {
      return NextResponse.json(
        { error: getLyricsOcrConfigError() },
        { status: 503 },
      )
    }

    const { id } = await params
    const song = await prisma.song.findUnique({
      where: { id },
      select: { id: true, sheetMusic: true },
    })

    if (!song) {
      return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
    }

    if (!song.sheetMusic) {
      return NextResponse.json({ error: '该歌曲没有歌谱' }, { status: 400 })
    }

    const lyrics = await tryExtractLyricsFromSheetPath(song.sheetMusic)
    if (!lyrics) {
      return NextResponse.json(
        { error: '未能从歌谱中识别出歌词' },
        { status: 502 },
      )
    }

    const updated = await prisma.song.update({
      where: { id },
      data: { lyrics },
      include: songDetailInclude,
    })

    return NextResponse.json({ lyrics, song: updated })
  } catch (error) {
    console.error('Extract and save lyrics error:', error)
    return NextResponse.json({ error: '歌谱歌词识别失败' }, { status: 500 })
  }
}
