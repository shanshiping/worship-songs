import { parseLrc } from '@/lib/lrc'

export type LyricsSection = { label: string | null; lines: string[] }

export type LyricsMetadata = {
  title?: string
  artist?: string | null
  lyricist?: string | null
  composer?: string | null
}

const LEADING_METADATA_PATTERN =
  /^(?:词|曲|作词|作曲|作者|演唱|原唱|歌名)[:：]\s*(.*)$/i

const CORE_SECTION_LABEL =
  /^(?:副歌|主歌|桥段|前奏|间奏|间奏\s*\d+|结尾|尾奏|叠句|重覆|重复|转调|Hook|Ending|Interlude|Intro|Outro|Chorus|Bridge|Refrain|Pre-?Chorus|Post-?Chorus|Verse\s*\d*)\s*[:：]?\s*$/i

const SECTION_LABEL_PATTERNS: RegExp[] = [
  CORE_SECTION_LABEL,
  /^第[一二三四五六七八九十百千万\d]+段\s*[:：]?\s*$/,
  /^第[一二三四五六七八九十百千万\d]+节\s*[:：]?\s*$/,
  /^[一二三四五六七八九十百千万]+段\s*[:：]?\s*$/,
  /^[1-9]\d*段\s*[:：]?\s*$/,
  /^主歌\s*[1-9\d一二三四五六七八九十]+\s*[:：]?\s*$/i,
  /^副歌\s*[1-9\d]*\s*[:：]?\s*$/i,
  /^[Vv]\s*\d+\s*[:：]?\s*$/,
  /^[Cc]\s*\d*\s*[:：]?\s*$/,
  /^\(\s*\d+\s*\)\s*[:：]?\s*$/,
  /^（\s*\d+\s*）\s*[:：]?\s*$/,
  /^[1-9]\d*[.)．、]\s*$/,
]

function normalizeLine(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[《》【】[\]()（）"'""'']/g, '')
}

function unwrapSectionLabelLine(line: string): string {
  const trimmed = line.trim()

  const square = trimmed.match(/^\[(.+)\]$/)
  if (square?.[1]) return square[1].trim()

  const chinese = trimmed.match(/^【(.+)】$/)
  if (chinese?.[1]) return chinese[1].trim()

  const fullParen = trimmed.match(/^（(.+)）$/)
  if (fullParen?.[1] && matchesSectionLabelPattern(fullParen[1].trim())) {
    return fullParen[1].trim()
  }

  return trimmed
    .replace(/^[\*\-–—·•\s]+/, '')
    .replace(/[\*\-–—·•\s]+$/, '')
    .trim()
}

function normalizeSectionLabel(line: string): string {
  return unwrapSectionLabelLine(line).replace(/\s*[:：]\s*$/, '')
}

function matchesSectionLabelPattern(line: string): boolean {
  const candidates = [line.trim(), unwrapSectionLabelLine(line)]
  return candidates.some((candidate) =>
    SECTION_LABEL_PATTERNS.some((pattern) => pattern.test(candidate))
  )
}

/** Parse a single line into a section label, if it looks like one. */
export function parseSectionLabel(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  if (!matchesSectionLabelPattern(trimmed)) return null
  return normalizeSectionLabel(trimmed)
}

export function isSectionLabel(line: string): boolean {
  return parseSectionLabel(line) !== null
}

function metadataValues(meta: LyricsMetadata): string[] {
  return [meta.title, meta.artist, meta.lyricist, meta.composer]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => normalizeLine(value))
}

function matchesKnownMetadata(line: string, meta: LyricsMetadata): boolean {
  const normalized = normalizeLine(line)
  if (!normalized) return true

  const known = metadataValues(meta)
  if (known.includes(normalized)) return true

  const labeled = line.trim().match(LEADING_METADATA_PATTERN)
  if (labeled) {
    const value = labeled[1]?.trim() ?? ''
    if (!value) return true
    return known.includes(normalizeLine(value))
  }

  return false
}

/** Pull author/lyricist from labeled lines when song metadata is empty. */
export function extractArtistFromLyrics(lyrics: string): string | null {
  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const match = line.match(/^(?:词|作词|作者)[:：]\s*(.+)$/i)
    if (match?.[1]?.trim()) return match[1].trim()
  }

  return null
}

/** Remove duplicated title/author header lines from the start of lyrics text. */
export function stripLeadingLyricsMetadata(
  lyrics: string,
  meta: LyricsMetadata
): string {
  if (!lyrics.trim()) return ''

  const kept: string[] = []
  let inHeader = true

  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    if (inHeader) {
      if (matchesKnownMetadata(line, meta)) continue
      inHeader = false
    }

    kept.push(line)
  }

  return kept.join('\n').trim()
}

/** Prefer plain lyrics; fall back to text extracted from LRC. */
export function resolveLyricsText(
  lyrics: string | null | undefined,
  lyricsLrc: string | null | undefined
): string {
  if (lyrics?.trim()) return lyrics.trim()
  if (!lyricsLrc?.trim()) return ''

  const lrcLines = parseLrc(lyricsLrc)
  if (lrcLines.length > 0) {
    return lrcLines
      .map((line) => line.text)
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

function shouldBreakOnBlankLine(section: LyricsSection | null): boolean {
  if (!section) return false
  if (section.label) return false
  return section.lines.length >= 2
}

/** Split plain lyrics into labeled sections for slide generation. */
export function parseLyricsSections(lyrics: string): LyricsSection[] {
  if (!lyrics.trim()) return []

  const sections: LyricsSection[] = []
  let current: LyricsSection | null = null

  const pushCurrent = () => {
    if (!current) return
    if (current.label || current.lines.length > 0) {
      sections.push(current)
    }
    current = null
  }

  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim()

    if (!line) {
      if (shouldBreakOnBlankLine(current)) {
        pushCurrent()
      }
      continue
    }

    const label = parseSectionLabel(line)
    if (label) {
      pushCurrent()
      current = { label, lines: [] }
      continue
    }

    if (!current) {
      current = { label: null, lines: [] }
    }
    current.lines.push(line)
  }

  pushCurrent()
  return sections
}

/** Split lines into fixed-size chunks (e.g. 4 lines per slide). */
export function chunkLines(lines: string[], size: number): string[][] {
  if (size <= 0 || lines.length === 0) return []
  const chunks: string[][] = []
  for (let i = 0; i < lines.length; i += size) {
    chunks.push(lines.slice(i, i + size))
  }
  return chunks
}
