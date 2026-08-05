import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import {
  buildCanonicalTitleUpdate,
  buildSongMergePlans,
  listSongsNeedingTitleCleanup,
  mergeSongScalarFields,
  mergeSongSheetFields,
  type SongForDedupe,
} from '../src/lib/song-dedupe'
import { normalizeSongTitle } from '../src/lib/song-title-normalize'

function createScriptPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  })
}

const songInclude = {
  _count: {
    select: {
      meetings: true,
      playlists: true,
      tags: true,
      teamShares: true,
      scriptures: true,
    },
  },
} as const

async function loadSongs(prisma: PrismaClient): Promise<SongForDedupe[]> {
  return prisma.song.findMany({
    include: songInclude,
    orderBy: { createdAt: 'asc' },
  })
}

async function normalizeAllTitles(prisma: PrismaClient, apply: boolean) {
  const songs = await loadSongs(prisma)
  const cleanup = listSongsNeedingTitleCleanup(songs)

  console.log(`\n标题去分号: ${cleanup.length} 首`)

  for (const song of cleanup) {
    const nextTitle = normalizeSongTitle(song.title)
    console.log(`  - "${song.title}" → "${nextTitle}"`)
    if (!apply) continue

    await prisma.song.update({
      where: { id: song.id },
      data: buildCanonicalTitleUpdate(song.title),
    })
  }
}

async function reassignUniqueSongLinks(
  prisma: PrismaClient,
  canonicalId: string,
  duplicateId: string,
) {
  const duplicateMeetings = await prisma.meetingSong.findMany({ where: { songId: duplicateId } })
  for (const row of duplicateMeetings) {
    const conflict = await prisma.meetingSong.findFirst({
      where: { meetingId: row.meetingId, songId: canonicalId },
    })
    if (conflict) {
      await prisma.meetingSong.delete({ where: { id: row.id } })
    } else {
      await prisma.meetingSong.update({
        where: { id: row.id },
        data: { songId: canonicalId },
      })
    }
  }

  const duplicatePlaylists = await prisma.playlistSong.findMany({ where: { songId: duplicateId } })
  for (const row of duplicatePlaylists) {
    const conflict = await prisma.playlistSong.findFirst({
      where: { playlistId: row.playlistId, songId: canonicalId },
    })
    if (conflict) {
      await prisma.playlistSong.delete({ where: { id: row.id } })
    } else {
      await prisma.playlistSong.update({
        where: { id: row.id },
        data: { songId: canonicalId },
      })
    }
  }

  const duplicateTeams = await prisma.teamSong.findMany({ where: { songId: duplicateId } })
  for (const row of duplicateTeams) {
    const conflict = await prisma.teamSong.findFirst({
      where: { teamId: row.teamId, songId: canonicalId },
    })
    if (conflict) {
      await prisma.teamSong.delete({ where: { id: row.id } })
    } else {
      await prisma.teamSong.update({
        where: { id: row.id },
        data: { songId: canonicalId },
      })
    }
  }
}

async function mergeDuplicateSong(
  prisma: PrismaClient,
  canonical: SongForDedupe,
  duplicate: SongForDedupe,
) {
  const scalarUpdates = mergeSongScalarFields(canonical, duplicate)
  const sheetUpdates = mergeSongSheetFields(canonical, duplicate)
  const titleUpdates = buildCanonicalTitleUpdate(canonical.title)

  await reassignUniqueSongLinks(prisma, canonical.id, duplicate.id)

  const duplicateTags = await prisma.songTag.findMany({
    where: { songId: duplicate.id },
    select: { tagId: true },
  })
  for (const tag of duplicateTags) {
    await prisma.songTag.upsert({
      where: { songId_tagId: { songId: canonical.id, tagId: tag.tagId } },
      create: { songId: canonical.id, tagId: tag.tagId },
      update: {},
    })
  }

  const duplicateScriptures = await prisma.songScripture.findMany({
    where: { songId: duplicate.id },
    orderBy: { order: 'asc' },
  })
  if (duplicateScriptures.length > 0) {
    const existing = await prisma.songScripture.findMany({
      where: { songId: canonical.id },
      select: { reference: true },
    })
    const existingRefs = new Set(existing.map((item) => item.reference))
    let order = existing.length
    for (const scripture of duplicateScriptures) {
      if (existingRefs.has(scripture.reference)) continue
      await prisma.songScripture.create({
        data: {
          songId: canonical.id,
          reference: scripture.reference,
          text: scripture.text,
          order,
        },
      })
      existingRefs.add(scripture.reference)
      order += 1
    }
  }

  await prisma.song.update({
    where: { id: canonical.id },
    data: {
      ...titleUpdates,
      ...scalarUpdates,
      ...(sheetUpdates.sheetMusicPages.length > 0
        ? {
            sheetMusic: sheetUpdates.sheetMusic,
            sheetMusicPages: sheetUpdates.sheetMusicPages,
          }
        : {}),
    },
  })

  await prisma.song.delete({ where: { id: duplicate.id } })
}

async function mergeDuplicateGroups(prisma: PrismaClient, apply: boolean) {
  const songs = await loadSongs(prisma)
  const plans = buildSongMergePlans(songs)

  console.log(`\n重复歌曲合并组: ${plans.length} 组，将删除 ${plans.reduce((n, p) => n + p.duplicateIds.length, 0)} 条重复记录`)

  for (const plan of plans) {
    console.log(`\n[${plan.canonicalTitle}]`)
    console.log(`  保留: ${plan.canonicalId}`)
    for (const title of plan.duplicateTitles) {
      console.log(`  合并并删除: "${title}"`)
    }

    if (!apply) continue

    let canonical = songs.find((song) => song.id === plan.canonicalId)
    if (!canonical) {
      canonical = await prisma.song.findUniqueOrThrow({
        where: { id: plan.canonicalId },
        include: songInclude,
      })
    }

    for (const duplicateId of plan.duplicateIds) {
      const duplicate = await prisma.song.findUniqueOrThrow({
        where: { id: duplicateId },
        include: songInclude,
      })
      await mergeDuplicateSong(prisma, canonical, duplicate)
      canonical = await prisma.song.findUniqueOrThrow({
        where: { id: plan.canonicalId },
        include: songInclude,
      })
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const prisma = createScriptPrisma()

  console.log(apply ? '执行模式：将写入数据库' : '预览模式：加 --apply 才会写入')

  try {
    const songs = await loadSongs(prisma)
    console.log(`当前歌曲总数: ${songs.length}`)

    await mergeDuplicateGroups(prisma, apply)
    await normalizeAllTitles(prisma, apply)

    const after = await loadSongs(prisma)
    console.log(`\n完成后歌曲总数: ${after.length}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
