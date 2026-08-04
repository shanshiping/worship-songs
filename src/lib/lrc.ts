export type LrcLine = { timeSec: number; text: string }

const LRC_LINE =
  /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/

/** Parse LRC text into timed lines. Lines without timestamps are skipped. */
export function parseLrc(source: string): LrcLine[] {
  if (!source.trim()) return []

  const lines: LrcLine[] = []
  for (const raw of source.split(/\r?\n/)) {
    const match = raw.trim().match(LRC_LINE)
    if (!match) continue
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    const frac = match[3] ?? '0'
    const ms =
      frac.length === 1
        ? Number(frac) * 100
        : frac.length === 2
          ? Number(frac) * 10
          : Number(frac.padEnd(3, '0').slice(0, 3))
    const timeSec = minutes * 60 + seconds + ms / 1000
    const text = (match[4] ?? '').trim()
    lines.push({ timeSec, text })
  }
  return lines
}
