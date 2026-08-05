import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/server-permissions'
import { readSheetBytes, resolveSheetPath } from '@/lib/sheet-lyrics'
import {
  filterSongsWithSheet,
  findSongsWithoutSheet,
  mergeSheetMusicPdf,
} from '@/lib/sheet-pdf-merge'

const MAX_SONGS = 20

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.SONG_DOWNLOAD)

    const body = (await request.json()) as { songIds?: unknown }
    const rawIds = body.songIds

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: '请选择至少一首歌曲' }, { status: 400 })
    }

    const songIds = [
      ...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.trim())),
    ]
    if (songIds.length === 0) {
      return NextResponse.json({ error: '请选择至少一首歌曲' }, { status: 400 })
    }
    if (songIds.length > MAX_SONGS) {
      return NextResponse.json({ error: `最多选择 ${MAX_SONGS} 首歌曲` }, { status: 400 })
    }

    const found = await prisma.song.findMany({
      where: { id: { in: songIds } },
      select: {
        id: true,
        title: true,
        sheetMusic: true,
      },
    })

    if (found.length === 0) {
      return NextResponse.json({ error: '未找到所选歌曲' }, { status: 404 })
    }

    const byId = new Map(found.map((song) => [song.id, song]))
    const ordered = songIds
      .map((id) => byId.get(id))
      .filter((song): song is (typeof found)[number] => Boolean(song))

    const skippedTitles = findSongsWithoutSheet(ordered)
    const withSheets = filterSongsWithSheet(ordered)

    if (withSheets.length === 0) {
      return NextResponse.json(
        { error: '所选歌曲均无可用歌谱', skippedTitles },
        { status: 400 },
      )
    }

    const mergeInputs = []
    for (const song of withSheets) {
      const path = song.sheetMusic!.trim()
      const resolved = resolveSheetPath(path)
      if (!resolved) {
        skippedTitles.push(song.title)
        continue
      }

      try {
        const bytes = await readSheetBytes(path)
        mergeInputs.push({
          title: song.title,
          sheetPath: path,
          bytes,
          mimeType: resolved.mimeType,
        })
      } catch {
        skippedTitles.push(song.title)
      }
    }

    if (mergeInputs.length === 0) {
      return NextResponse.json(
        { error: '所选歌曲均无可用歌谱', skippedTitles },
        { status: 400 },
      )
    }

    const pdfBytes = await mergeSheetMusicPdf(mergeInputs)
    const date = new Date().toISOString().slice(0, 10)
    const filename = `worship-sheets-${date}.pdf`

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }

    const uniqueSkipped = [...new Set(skippedTitles)]
    if (uniqueSkipped.length > 0) {
      headers['X-Skipped-Songs'] = encodeURIComponent(uniqueSkipped.join('|'))
    }

    return new NextResponse(Buffer.from(pdfBytes), { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失败'
    if (message === '请先登录') {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    if (message === '权限不足') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2022'
    ) {
      console.error('Sheet merge error: database schema out of date', error)
      return NextResponse.json(
        { error: '数据库未同步最新结构，请运行 pnpm exec prisma db push' },
        { status: 500 },
      )
    }
    console.error('Sheet merge error:', error)
    return NextResponse.json({ error: '生成歌谱 PDF 失败' }, { status: 500 })
  }
}
