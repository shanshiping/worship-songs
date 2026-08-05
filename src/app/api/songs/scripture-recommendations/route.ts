import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getScriptureRecommendations,
  isValidScriptureReference,
} from '@/lib/scripture-recommendations'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')?.trim() || ''

    if (!reference) {
      return NextResponse.json({ error: '请提供经文出处' }, { status: 400 })
    }

    if (!isValidScriptureReference(reference)) {
      return NextResponse.json(
        { error: '经文搜索至少需要 2 个字符' },
        { status: 400 },
      )
    }

    const recommendations = await getScriptureRecommendations(reference)
    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Scripture recommendations error:', error)
    return NextResponse.json({ error: '获取经文推荐失败' }, { status: 500 })
  }
}
