import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 获取歌曲基本信息
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })

    if (!song) {
      return NextResponse.json(
        { error: '歌曲不存在' },
        { status: 404 }
      )
    }

    // 获取使用记录
    let meetings: any[] = []
    try {
      const meetingSongs = await prisma.meetingSong.findMany({
        where: { songId: id },
        include: {
          meeting: true,
        },
      })

      meetings = meetingSongs.map(ms => ({
        meeting: ms.meeting,
      }))
    } catch (e) {
      console.error('Get meetings error:', e)
    }

    const result = {
      ...song,
      meetings,
    }

    return NextResponse.json(result)
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
    const { id } = await params
    const body = await request.json()
    const { title, artist, categoryId, sheetMusic, audioFile, lyrics, notes } = body

    const song = await prisma.song.update({
      where: { id },
      data: {
        title,
        artist,
        categoryId,
        sheetMusic,
        audioFile,
        lyrics,
        notes,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(song)
  } catch (error: any) {
    console.error('Update song error:', error)
    return NextResponse.json(
      { error: error.message || '更新歌曲失败' },
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

    await prisma.song.delete({
      where: { id },
    })

    return NextResponse.json({ message: '歌曲已删除' })
  } catch (error: any) {
    console.error('Delete song error:', error)
    return NextResponse.json(
      { error: error.message || '删除歌曲失败' },
      { status: 500 }
    )
  }
}
