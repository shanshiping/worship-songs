export async function requestExtractedLyrics(
  sheetPath: string,
): Promise<{ ok: true; lyrics: string } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/songs/extract-lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: sheetPath }),
    })
    const data = (await response.json()) as { lyrics?: string; error?: string }
    if (!response.ok) {
      return { ok: false, error: data.error || 'extractFailed' }
    }
    return { ok: true, lyrics: data.lyrics || '' }
  } catch {
    return { ok: false, error: 'extractFailed' }
  }
}

export async function requestExtractAndSaveLyrics(
  songId: string,
): Promise<{ ok: true; lyrics: string } | { ok: false; error: string }> {
  try {
    const response = await fetch(`/api/songs/${songId}/extract-lyrics`, {
      method: 'POST',
    })
    const data = (await response.json()) as { lyrics?: string; error?: string }
    if (!response.ok) {
      return { ok: false, error: data.error || 'extractFailed' }
    }
    return { ok: true, lyrics: data.lyrics || '' }
  } catch {
    return { ok: false, error: 'extractFailed' }
  }
}
