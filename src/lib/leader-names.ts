/** Aliases that should be grouped under one canonical leader name. */
const LEADER_ALIASES: Record<string, string> = {
  徐黎明: '黎明',
  海平: '王海平',
  张壮康: '壮壮',
}

/** Values stored in the leader field that are not actual worship leaders. */
const INVALID_LEADER_NAMES = new Set(['向神欢呼'])

export function normalizeLeaderName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null

  const canonical = LEADER_ALIASES[trimmed] ?? trimmed
  if (INVALID_LEADER_NAMES.has(trimmed) || INVALID_LEADER_NAMES.has(canonical)) {
    return null
  }

  return canonical
}

export function leaderNameVariants(name: string): string[] {
  const canonical = normalizeLeaderName(name) ?? name.trim()
  const aliases = Object.entries(LEADER_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([alias]) => alias)
  return [...new Set([canonical, ...aliases])]
}

export function dedupeLeaderNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const name of names) {
    const canonical = normalizeLeaderName(name)
    if (!canonical || seen.has(canonical)) continue
    seen.add(canonical)
    result.push(canonical)
  }

  return result.sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function leaderMatchesFilter(
  name: string | null | undefined,
  filter: string | null | undefined
): boolean {
  const canonicalName = normalizeLeaderName(name)
  const canonicalFilter = normalizeLeaderName(filter)
  if (!canonicalName || !canonicalFilter) return false
  return canonicalName === canonicalFilter
}
