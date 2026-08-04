export const TAG_KINDS = ['TYPE', 'STYLE'] as const

export type TagKind = (typeof TAG_KINDS)[number]

export function isTagKind(value: string): value is TagKind {
  return value === 'TYPE' || value === 'STYLE'
}

export function normalizeTagName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 50) return null
  return trimmed
}

export function parseTagKind(kind: unknown): TagKind | null {
  return typeof kind === 'string' && isTagKind(kind) ? kind : null
}
