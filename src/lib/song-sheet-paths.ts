const SHEET_PREFIX = '/uploads/sheets/'

export type SongSheetSource = {
  sheetMusic?: string | null
  sheetMusicPages?: unknown
}

/** Parse stored JSON pages field into validated public sheet paths. */
export function parseSheetMusicPages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const paths: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed.startsWith(SHEET_PREFIX) || trimmed.includes('..')) continue
    if (!paths.includes(trimmed)) paths.push(trimmed)
  }
  return paths
}

/** All sheet paths for a song (pages field, else legacy single sheetMusic). */
export function getSongSheetPaths(song: SongSheetSource): string[] {
  const pages = parseSheetMusicPages(song.sheetMusicPages)
  if (pages.length > 0) return pages
  const legacy = song.sheetMusic?.trim()
  return legacy ? [legacy] : []
}

export function songHasSheetMusic(song: SongSheetSource): boolean {
  return getSongSheetPaths(song).length > 0
}

/** Parse request body: prefer sheetMusicPages array, fall back to sheetMusic. */
export function parseSheetMusicPagesInput(
  pagesRaw: unknown,
  legacySheetRaw?: unknown,
): string[] {
  const fromPages = parseSheetMusicPages(pagesRaw)
  if (fromPages.length > 0) return fromPages

  if (typeof legacySheetRaw === 'string') {
    const trimmed = legacySheetRaw.trim()
    if (trimmed.startsWith(SHEET_PREFIX) && !trimmed.includes('..')) {
      return [trimmed]
    }
  }

  return []
}

/** Persist both legacy first-page field and multi-page JSON. */
export function sheetFieldsFromPages(pages: string[]): {
  sheetMusic: string | null
  sheetMusicPages: string[]
} {
  const cleaned = pages
    .map((path) => path.trim())
    .filter((path) => path.startsWith(SHEET_PREFIX) && !path.includes('..'))

  const unique: string[] = []
  for (const path of cleaned) {
    if (!unique.includes(path)) unique.push(path)
  }

  return {
    sheetMusic: unique[0] ?? null,
    sheetMusicPages: unique,
  }
}
