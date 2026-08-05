import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aggregateSongKeys } from '@/lib/song-key-filter'

export async function GET() {
  try {
    const rows = await prisma.song.findMany({
      where: { key: { not: null } },
      select: { key: true },
    })

    return NextResponse.json({
      keys: aggregateSongKeys(rows),
    })
  } catch (error) {
    console.error('Song keys API error:', error)
    return NextResponse.json({ error: '获取调性列表失败' }, { status: 500 })
  }
}
