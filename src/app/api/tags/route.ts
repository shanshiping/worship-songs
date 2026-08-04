import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind')

    const where =
      kind === 'TYPE' || kind === 'STYLE' ? { kind } : undefined

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 })
  }
}
