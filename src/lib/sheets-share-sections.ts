export const SHEETS_SHARE_SECTIONS = ['main', 'response', 'communion'] as const

export type SheetsShareSection = (typeof SHEETS_SHARE_SECTIONS)[number]

export function isSheetsShareSection(value: unknown): value is SheetsShareSection {
  return typeof value === 'string' && SHEETS_SHARE_SECTIONS.includes(value as SheetsShareSection)
}

export function groupSongsBySection<T extends { section?: string | null; order: number }>(
  items: T[],
): Record<SheetsShareSection, T[]> {
  const grouped: Record<SheetsShareSection, T[]> = {
    main: [],
    response: [],
    communion: [],
  }

  for (const item of items) {
    const section = isSheetsShareSection(item.section) ? item.section : 'main'
    grouped[section].push(item)
  }

  for (const section of SHEETS_SHARE_SECTIONS) {
    grouped[section].sort((a, b) => a.order - b.order)
  }

  return grouped
}
