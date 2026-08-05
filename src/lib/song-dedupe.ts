import { getSongSheetPaths, sheetFieldsFromPages } from '@/lib/song-sheet-paths'
import { getSongTitleInitial } from '@/lib/song-title-index'
import { titleInitialFieldsForTitle } from '@/lib/song-title-initial-sync'
import { normalizeSongTitle, songDedupeKey, songTitleNeedsNormalization } from '@/lib/song-title-normalize'

export type SongForDedupe = {
  id: string
  title: string
  artist: string | null
  key: string | null
  timeSignature: string | null
  composer: string | null
  lyricist: string | null
  team: string | null
  album: string | null
  mvUrl: string | null
  coverImage: string | null
  pptBackground: string | null
  sheetMusic: string | null
  sheetMusicPages: unknown
  audioFile: string | null
  lyrics: string | null
  lyricsLrc: string | null
  notes: string | null
  createdAt: Date
  _count?: {
    meetings: number
    playlists: number
    tags: number
    teamShares: number
    scriptures: number
  }
}

export type SongMergePlan = {
  key: string
  canonicalId: string
  canonicalTitle: string
  duplicateIds: string[]
  duplicateTitles: string[]
}

const MERGEABLE_SCALAR_FIELDS = [
  'artist',
  'key',
  'timeSignature',
  'composer',
  'lyricist',
  'team',
  'album',
  'mvUrl',
  'coverImage',
  'pptBackground',
  'audioFile',
  'notes',
] as const satisfies ReadonlyArray<keyof SongForDedupe>

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function completenessScore(song: SongForDedupe): number {
  const sheetCount = getSongSheetPaths(song).length
  let score = 0

  if (hasText(song.lyrics)) score += 20 + Math.min(song.lyrics.length, 500) / 100
  if (hasText(song.lyricsLrc)) score += 8
  if (hasText(song.audioFile)) score += 15
  score += sheetCount * 12
  if (hasText(song.coverImage)) score += 4
  if (hasText(song.pptBackground)) score += 2
  if (hasText(song.composer)) score += 1
  if (hasText(song.lyricist)) score += 1
  if (hasText(song.artist)) score += 1
  if (hasText(song.notes)) score += 1

  score += (song._count?.meetings ?? 0) * 6
  score += (song._count?.playlists ?? 0) * 3
  score += (song._count?.tags ?? 0) * 2
  score += (song._count?.scriptures ?? 0) * 2
  score += (song._count?.teamShares ?? 0) * 2

  if (!/[；;]/.test(song.title)) score += 3

  return score
}

export function pickCanonicalSong(songs: SongForDedupe[]): SongForDedupe {
  return [...songs].sort((a, b) => {
    const scoreDiff = completenessScore(b) - completenessScore(a)
    if (scoreDiff !== 0) return scoreDiff
    return a.createdAt.getTime() - b.createdAt.getTime()
  })[0]!
}

export function groupSongsForDedupe(songs: SongForDedupe[]): Map<string, SongForDedupe[]> {
  const groups = new Map<string, SongForDedupe[]>()

  for (const song of songs) {
    const key = songDedupeKey(song.title)
    if (!key) continue
    const bucket = groups.get(key) ?? []
    bucket.push(song)
    groups.set(key, bucket)
  }

  return groups
}

export function buildSongMergePlans(songs: SongForDedupe[]): SongMergePlan[] {
  const plans: SongMergePlan[] = []

  for (const [key, group] of groupSongsForDedupe(songs)) {
    if (group.length < 2) continue
    const canonical = pickCanonicalSong(group)
    const duplicates = group.filter((song) => song.id !== canonical.id)
    plans.push({
      key,
      canonicalId: canonical.id,
      canonicalTitle: normalizeSongTitle(canonical.title),
      duplicateIds: duplicates.map((song) => song.id),
      duplicateTitles: duplicates.map((song) => song.title),
    })
  }

  return plans.sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle, ['zh-CN', 'en']))
}

export function mergeSongScalarFields(
  canonical: SongForDedupe,
  duplicate: SongForDedupe,
): Partial<
  Pick<SongForDedupe, (typeof MERGEABLE_SCALAR_FIELDS)[number] | 'lyrics' | 'lyricsLrc'>
> {
  const updates: Partial<
    Pick<SongForDedupe, (typeof MERGEABLE_SCALAR_FIELDS)[number] | 'lyrics' | 'lyricsLrc'>
  > = {}

  for (const field of MERGEABLE_SCALAR_FIELDS) {
    if (!hasText(canonical[field]) && hasText(duplicate[field])) {
      updates[field] = duplicate[field]
    }
  }

  if (
    (!hasText(canonical.lyrics) ||
      (hasText(duplicate.lyrics) && duplicate.lyrics.length > (canonical.lyrics?.length ?? 0))) &&
    hasText(duplicate.lyrics)
  ) {
    updates.lyrics = duplicate.lyrics
  }

  if (!hasText(canonical.lyricsLrc) && hasText(duplicate.lyricsLrc)) {
    updates.lyricsLrc = duplicate.lyricsLrc
  }

  return updates
}

export function mergeSongSheetFields(
  canonical: SongForDedupe,
  duplicate: SongForDedupe,
): { sheetMusic: string | null; sheetMusicPages: string[] } {
  const mergedPages = [...getSongSheetPaths(canonical), ...getSongSheetPaths(duplicate)]
  return sheetFieldsFromPages(mergedPages)
}

export function buildCanonicalTitleUpdate(title: string): {
  title: string
  titleInitial: ReturnType<typeof getSongTitleInitial>
  titleInitialOrder: number
} {
  const normalized = normalizeSongTitle(title)
  return {
    title: normalized,
    ...titleInitialFieldsForTitle(normalized),
  }
}

export function listSongsNeedingTitleCleanup(songs: SongForDedupe[]): SongForDedupe[] {
  return songs.filter((song) => songTitleNeedsNormalization(song.title))
}
