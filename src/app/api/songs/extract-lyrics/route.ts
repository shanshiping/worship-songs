import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getLyricsOcrConfigError,
  isLyricsOcrConfigured,
} from '@/lib/lyrics-ocr-config'
import { extractLyricsFromSheet } from '@/lib/lyrics-ocr'
import { readSheetBytes, resolveSheetPath } from '@/lib/sheet-lyrics'

export { resolveSheetPath }

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    if (!isLyricsOcrConfigured()) {
      return NextResponse.json(
        { error: getLyricsOcrConfigError() },
        { status: 503 }
      )
    }

    const body = await request.json()
    const resolved = resolveSheetPath(body?.path)
    if (!resolved) {
      return NextResponse.json(
        { error: '无效的歌谱路径' },
        { status: 400 }
      )
    }

    let bytes: Buffer
    try {
      bytes = await readSheetBytes(body.path)
    } catch {
      return NextResponse.json(
        { error: '歌谱文件不存在' },
        { status: 404 }
      )
    }

    try {
      const lyrics = await extractLyricsFromSheet({
        bytes,
        mimeType: resolved.mimeType,
      })
      return NextResponse.json({ lyrics })
    } catch (err) {
      console.error('Lyrics OCR extract error:', err)
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : '歌谱歌词识别失败',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('Extract lyrics error:', error)
    return NextResponse.json(
      { error: '歌谱歌词识别失败' },
      { status: 500 }
    )
  }
}
