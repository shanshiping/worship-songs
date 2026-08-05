import { NextResponse } from 'next/server'
import {
  createSheetsShare,
  isSheetsShareSchemaError,
  SHEETS_SHARE_SCHEMA_HINT,
} from '@/lib/sheets-share'
import { getCurrentUser } from '@/lib/server-permissions'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = (await request.json()) as {
      theme?: unknown
      scripture?: unknown
      arrangement?: unknown
      songIds?: unknown
      responseSongIds?: unknown
      communionSongIds?: unknown
    }

    const result = await createSheetsShare({
      theme: typeof body.theme === 'string' ? body.theme : null,
      scripture: typeof body.scripture === 'string' ? body.scripture : null,
      arrangement: typeof body.arrangement === 'string' ? body.arrangement : null,
      songIds: body.songIds,
      responseSongIds: body.responseSongIds,
      communionSongIds: body.communionSongIds,
      createdById: user.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建分享链接失败'
    if (message === '请选择至少一首歌曲' || message.startsWith('最多选择')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (message === '未找到所选歌曲') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (isSheetsShareSchemaError(error)) {
      console.error('Sheets share schema not ready:', error)
      return NextResponse.json({ error: SHEETS_SHARE_SCHEMA_HINT }, { status: 503 })
    }
    console.error('Sheets share create error:', error)
    return NextResponse.json({ error: '创建分享链接失败' }, { status: 500 })
  }
}
