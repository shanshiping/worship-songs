export async function downloadLyricsPpt(
  songIds: string[]
): Promise<{ skipped: string[] }> {
  const response = await fetch('/api/songs/ppt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds }),
  })

  if (!response.ok) {
    let message = 'Failed to generate PPT'
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

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const filenameMatch = disposition?.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? 'worship-lyrics.pptx'

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)

  return { skipped }
}
