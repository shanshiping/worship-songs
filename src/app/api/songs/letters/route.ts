import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SONG_INDEX_LETTERS } from '@/lib/song-title-index'
import {
  countSongsByInitial,
  loadSongsForInitialIndex,
  syncStaleSongTitleInitials,
} from '@/lib/song-title-initial-sync'

export async function GET() {
  try {
    const songs = await loadSongsForInitialIndex(prisma)
    const counts = countSongsByInitial(songs)

    void syncStaleSongTitleInitials(prisma, songs).catch((error) => {
      console.error('Background song initial sync failed:', error)
    })

    return NextResponse.json({
      letters: SONG_INDEX_LETTERS.map((letter) => ({
        letter,
        count: counts.get(letter) ?? 0,
      })).filter((item) => item.count > 0),
    })
  } catch (error) {
    console.error('Song letters API error:', error)
    return NextResponse.json({ error: '获取首字母索引失败' }, { status: 500 })
  }
}
