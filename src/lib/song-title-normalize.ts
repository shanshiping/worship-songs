/** Remove semicolons and collapse whitespace in a song title. */
export function normalizeSongTitle(title: string): string {
  return title
    .trim()
    .replace(/[；;]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Key for grouping duplicate songs (normalized title, case-insensitive). */
export function songDedupeKey(title: string): string {
  return normalizeSongTitle(title).toLowerCase()
}

export function songTitleNeedsNormalization(title: string): boolean {
  return title !== normalizeSongTitle(title)
}
