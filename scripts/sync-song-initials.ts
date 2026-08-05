import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { syncSongTitleInitials } from '../src/lib/song-title-initial-sync'

function createScriptPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  })
}

async function main() {
  const prisma = createScriptPrisma()
  try {
    const updated = await syncSongTitleInitials(prisma)
    console.log(`Synced title initials for ${updated} songs.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
