import type { Prisma } from '@prisma/client'

export function parseSongKeyParams(raw: string | null): string[] {
  if (!raw) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
}

export function parseSongKeyParamsFromSearchParams(searchParams: URLSearchParams): string[] {
  return [
    ...new Set(
      searchParams
        .getAll('keys')
        .flatMap((value) => parseSongKeyParams(value))
        .filter(Boolean),
    ),
  ]
}

export function buildSongKeyWhere(keys: string[]): Prisma.SongWhereInput | null {
  const normalized = [...new Set(keys.map((key) => key.trim()).filter(Boolean))]
  if (normalized.length === 0) return null
  if (normalized.length === 1) {
    return { key: { equals: normalized[0], mode: 'insensitive' } }
  }
  return {
    OR: normalized.map((key) => ({
      key: { equals: key, mode: 'insensitive' },
    })),
  }
}

export function aggregateSongKeys(
  rows: Array<{ key: string | null }>,
): Array<{ key: string; count: number }> {
  const byLower = new Map<string, { key: string; count: number }>()
  for (const row of rows) {
    const trimmed = row.key?.trim()
    if (!trimmed) continue
    const lower = trimmed.toLowerCase()
    const existing = byLower.get(lower)
    if (existing) {
      existing.count += 1
    } else {
      byLower.set(lower, { key: trimmed, count: 1 })
    }
  }
  return [...byLower.values()].sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { sensitivity: 'base' }),
  )
}
