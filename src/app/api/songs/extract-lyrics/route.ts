import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractLyricsFromSheet } from '@/lib/gemini-lyrics'
import { readFile } from 'fs/promises'
import path from 'path'

const SHEET_PREFIX = '/uploads/sheets/'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

/** Resolve a public sheet path to an absolute file path, or null if unsafe/invalid. */
export function resolveSheetPath(rawPath: unknown): {
  absolutePath: string
  mimeType: string
} | null {
  if (typeof rawPath !== 'string') return null
  const trimmed = rawPath.trim()
  if (!trimmed.startsWith(SHEET_PREFIX)) return null
  if (trimmed.includes('..') || trimmed.includes('\\')) return null

  const relative = trimmed.slice(1) // uploads/sheets/...
  const fileName = path.basename(relative)
  if (!fileName || fileName !== relative.split('/').pop()) return null

  const ext = path.extname(fileName).toLowerCase()
  const mimeType = MIME_BY_EXT[ext]
  if (!mimeType) return null

  const absolutePath = path.join(process.cwd(), 'public', 'uploads', 'sheets', fileName)
  return { absolutePath, mimeType }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 GEMINI_API_KEY，无法识别歌谱歌词' },
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
      bytes = await readFile(resolved.absolutePath)
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
        apiKey,
      })
      return NextResponse.json({ lyrics })
    } catch (err) {
      console.error('Gemini extract error:', err)
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
