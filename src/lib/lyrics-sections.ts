import { parseLrc } from '@/lib/lrc'

export type LyricsSection = { label: string | null; lines: string[] }

export type LyricsMetadata = {
  title?: string
  artist?: string | null
  lyricist?: string | null
  composer?: string | null
}

const METADATA_LABELS =
  '词曲唱|词\\/曲|曲\\/词|词曲|制作人|演唱者|作词|作曲|作詞|编曲|編曲|编词|制作|製作|监制|原唱|歌手|作者|歌名|词|曲|演唱'

const CREDIT_LIKE_LINE_PATTERN = new RegExp(
  `^(?:${METADATA_LABELS})(?:\\s*[:：·.／/\\-—–]|\\s+|$)`,
  'iu'
)

const METADATA_LINE_PATTERN = new RegExp(
  `^(?:${METADATA_LABELS})(?:\\s*[:：·.／/\\-—–]\\s*|\\s+)(.+)$`,
  'iu'
)

const METADATA_LABEL_ONLY_PATTERN = new RegExp(`^(?:${METADATA_LABELS})$`, 'iu')

const INLINE_METADATA_PATTERN = new RegExp(
  `(?:${METADATA_LABELS})\\s*[:：]?\\s*([^\\s词曲作演编制录/／]+(?:\\s*[/／]\\s*[^\\s词曲作演编制录/／]+)?)`,
  'giu'
)

function sanitizeCreditInput(line: string): string {
  return line
    .trim()
    .replace(/^[\[【(（*]+/, '')
    .replace(/[\]】)）*]+$/, '')
    .trim()
}

const CREDIT_KIND_ORDER = [
  'lyricist',
  'composer',
  'combined',
  'arranger',
  'production',
  'producer',
  'performer',
] as const

function creditKind(label: string): string {
  const normalized = label.replace(/\s/g, '')
  if (/^(词|作词|作者|作詞)$/iu.test(normalized)) return 'lyricist'
  if (/^(曲|作曲)$/iu.test(normalized)) return 'composer'
  if (/^(词曲|词曲唱|词\/曲|曲\/词)$/iu.test(normalized)) return 'combined'
  if (/^(编曲|編曲|编词)$/iu.test(normalized)) return 'arranger'
  if (/^(制作|製作)$/iu.test(normalized)) return 'production'
  if (/^(制作人|监制)$/iu.test(normalized)) return 'producer'
  if (/^(演唱|演唱者|原唱|歌手)$/iu.test(normalized)) return 'performer'
  return `other:${normalized.toLowerCase()}`
}

function sortCreditsForTitleSlide(credits: string[]): string[] {
  return [...credits].sort((a, b) => {
    const kindA = creditKind(a.split(/[:：]/u)[0] ?? '')
    const kindB = creditKind(b.split(/[:：]/u)[0] ?? '')
    const indexA = CREDIT_KIND_ORDER.indexOf(kindA as (typeof CREDIT_KIND_ORDER)[number])
    const indexB = CREDIT_KIND_ORDER.indexOf(kindB as (typeof CREDIT_KIND_ORDER)[number])
    const orderA = indexA === -1 ? CREDIT_KIND_ORDER.length + 1 : indexA
    const orderB = indexB === -1 ? CREDIT_KIND_ORDER.length + 1 : indexB
    if (orderA !== orderB) return orderA - orderB
    return a.localeCompare(b, 'zh-CN')
  })
}

function formatCreditLine(label: string, value: string): string {
  const cleanLabel = label.trim()
  const cleanValue = value.trim()
  if (!cleanLabel || !cleanValue) return ''
  return `${cleanLabel}：${cleanValue}`
}

/** Normalize a metadata line for display on the title slide. */
export function parseMetadataCreditLine(line: string): string | null {
  const trimmed = sanitizeCreditInput(line)
  if (!trimmed) return null

  const match = trimmed.match(METADATA_LINE_PATTERN)
  if (!match?.[1]?.trim()) return null

  const label = trimmed.slice(0, trimmed.indexOf(match[1])).replace(/\s*[:：·.／/\\-—–]+\s*$/u, '').trim()
  return formatCreditLine(label, match[1])
}

function parseMetadataLabelOnly(line: string): string | null {
  const trimmed = sanitizeCreditInput(line)
  if (!trimmed || !METADATA_LABEL_ONLY_PATTERN.test(trimmed)) return null
  return trimmed
}

function extractInlineCreditsFromLine(line: string): string[] {
  const credits: string[] = []
  const pattern = new RegExp(INLINE_METADATA_PATTERN.source, 'giu')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(line)) !== null) {
    const value = match[1]?.trim()
    if (!value) continue
    const label = match[0]
      .slice(0, match[0].indexOf(match[1]))
      .replace(/\s*[:：]?\s*$/u, '')
      .trim()
    if (!label) continue
    credits.push(formatCreditLine(label, value))
  }

  return credits
}

function isLooseCreditLine(line: string): boolean {
  const trimmed = sanitizeCreditInput(line)
  if (!trimmed) return false
  return (
    parseMetadataCreditLine(trimmed) !== null ||
    parseMetadataLabelOnly(trimmed) !== null ||
    extractInlineCreditsFromLine(trimmed).length > 0 ||
    CREDIT_LIKE_LINE_PATTERN.test(trimmed)
  )
}

function isCreditValueLine(line: string, meta: LyricsMetadata): boolean {
  if (!line) return false
  if (parseSectionLabel(line)) return false
  if (parseMetadataLabelOnly(line)) return false
  if (parseMetadataCreditLine(line)) return false
  if (extractInlineCreditsFromLine(line).length > 0) return false
  if (matchesKnownMetadata(line, meta)) return false
  return true
}

function addCreditLine(
  credits: string[],
  filledKinds: Set<string>,
  line: string,
  options: { preferExisting?: boolean; allowDuplicateKind?: boolean } = {}
): void {
  const { preferExisting = false, allowDuplicateKind = false } = options
  const formatted = parseMetadataCreditLine(line) ?? line
  const match = formatted.match(/^(.+?)[:：](.+)$/u)
  if (!match?.[2]?.trim()) return

  const kind = creditKind(match[1])
  if (preferExisting && filledKinds.has(kind)) return
  if (!allowDuplicateKind && filledKinds.has(kind)) return

  filledKinds.add(kind)
  credits.push(formatCreditLine(match[1], match[2]))
}

function seedCreditsFromMeta(credits: string[], filledKinds: Set<string>, meta: LyricsMetadata): void {
  if (meta.lyricist?.trim()) {
    addCreditLine(credits, filledKinds, `词：${meta.lyricist.trim()}`)
  }
  if (meta.composer?.trim()) {
    addCreditLine(credits, filledKinds, `曲：${meta.composer.trim()}`)
  }
  if (meta.artist?.trim()) {
    addCreditLine(credits, filledKinds, `演唱：${meta.artist.trim()}`)
  }
}

const CORE_SECTION_LABEL =
  /^(?:副歌|主歌|桥段|前奏|间奏|间奏\s*\d+|结尾|尾奏|叠句|重覆|重复|转调|预备|呼召|敬拜|慢板|快板|升调|降调|Tag|Hook|Ending|Interlude|Intro|Outro|Chorus|Bridge|Refrain|Pre-?Chorus|Post-?Chorus|Verse\s*\d*)\s*[:：]?\s*$/i

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
  /^[Aa]\s*段\s*[:：]?\s*$/,
  /^[Bb]\s*段\s*[:：]?\s*$/,
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

export function isLyricsMetadataLine(line: string): boolean {
  return isLooseCreditLine(line)
}

function matchesKnownMetadata(line: string, meta: LyricsMetadata): boolean {
  const normalized = normalizeLine(line)
  if (!normalized) return true

  const known = metadataValues(meta)
  if (known.includes(normalized)) return true

  if (isLyricsMetadataLine(line)) return true

  return false
}

/** Build title-slide credits and lyric body without production metadata lines. */
export function buildTitleCredits(
  lyrics: string,
  meta: LyricsMetadata
): { credits: string[]; body: string } {
  const credits: string[] = []
  const filledKinds = new Set<string>()
  const skipLineIndices = new Set<number>()

  seedCreditsFromMeta(credits, filledKinds, meta)

  if (!lyrics.trim()) {
    return { credits: sortCreditsForTitleSlide(credits), body: '' }
  }

  const rawLines = lyrics.split(/\r?\n/)

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = sanitizeCreditInput(rawLines[index] ?? '')
    if (!line) continue

    const labelOnly = parseMetadataLabelOnly(line)
    if (labelOnly) {
      const nextLine = sanitizeCreditInput(rawLines[index + 1] ?? '')
      if (nextLine && isCreditValueLine(nextLine, meta)) {
        addCreditLine(credits, filledKinds, `${labelOnly}：${nextLine}`, { preferExisting: true })
        skipLineIndices.add(index)
        skipLineIndices.add(index + 1)
        index += 1
      } else {
        skipLineIndices.add(index)
      }
      continue
    }

    const inlineCredits = extractInlineCreditsFromLine(line)
    if (inlineCredits.length > 0) {
      inlineCredits.forEach((credit) =>
        addCreditLine(credits, filledKinds, credit, { preferExisting: true })
      )
      skipLineIndices.add(index)
      continue
    }

    const creditLine = parseMetadataCreditLine(line)
    if (creditLine) {
      addCreditLine(credits, filledKinds, creditLine, { preferExisting: true })
      skipLineIndices.add(index)
    }
  }

  const bodyLines: string[] = []

  for (let index = 0; index < rawLines.length; index += 1) {
    if (skipLineIndices.has(index)) continue

    const line = sanitizeCreditInput(rawLines[index] ?? '')
    if (!line) {
      if (bodyLines.length > 0) bodyLines.push('')
      continue
    }

    if (bodyLines.length === 0 && matchesKnownMetadata(line, meta)) {
      continue
    }

    if (isLooseCreditLine(line)) {
      continue
    }

    bodyLines.push(line)
  }

  const body = bodyLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { credits: sortCreditsForTitleSlide(credits), body }
}

/** Extract 词/曲/编曲/演唱 credits for the title slide and return lyric body. */
export function extractLyricsCredits(
  lyrics: string,
  meta: LyricsMetadata
): { credits: string[]; body: string } {
  return buildTitleCredits(lyrics, meta)
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
  return extractLyricsCredits(lyrics, meta).body
}

/** Split plain lyrics into paragraph groups (blank-line separated). */
export function splitLyricsParagraphs(lyrics: string): string[][] {
  if (!lyrics.trim()) return []

  const paragraphs: string[][] = []
  let current: string[] = []

  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      if (current.length > 0) {
        paragraphs.push(current)
        current = []
      }
      continue
    }
    current.push(line)
  }

  if (current.length > 0) {
    paragraphs.push(current)
  }

  return paragraphs
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

    if (parseMetadataCreditLine(line) || parseMetadataLabelOnly(line) || isLooseCreditLine(line)) {
      continue
    }

    if (extractInlineCreditsFromLine(line).length > 0) {
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
