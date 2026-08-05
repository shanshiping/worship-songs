export async function fetchMergedSheetPdf(
  songIds: string[],
): Promise<{ blob: Blob; filename: string; skipped: string[] }> {
  const response = await fetch('/api/songs/sheets/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds }),
  })

  if (!response.ok) {
    let message = 'Failed to generate sheet PDF'
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(message)
  }

  const skippedHeader = response.headers.get('X-Skipped-Songs')
  const skipped = skippedHeader
    ? decodeURIComponent(skippedHeader).split('|').filter(Boolean)
    : []

  const buffer = await response.arrayBuffer()
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const disposition = response.headers.get('Content-Disposition')
  const filenameMatch = disposition?.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? 'worship-sheets.pdf'

  return { blob, filename, skipped }
}

export async function downloadMergedSheetPdf(
  songIds: string[],
): Promise<{ skipped: string[] }> {
  const { blob, filename, skipped } = await fetchMergedSheetPdf(songIds)

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)

  return { skipped }
}
