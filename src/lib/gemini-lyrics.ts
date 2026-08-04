const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const EXTRACT_PROMPT = `Extract only the sung lyric lines from this sheet music image or PDF.
Rules:
- Output plain text lyrics only, one lyric line per line.
- Omit musical notation, chord symbols, clefs, measure numbers, page headers/footers, and titles/artist if they are not lyric lines.
- Preserve the original language of the lyrics.
- If no lyrics are found, return an empty string.`

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: { message?: string }
}

export async function extractLyricsFromSheet(params: {
  bytes: Buffer
  mimeType: string
  apiKey: string
}): Promise<string> {
  const { bytes, mimeType, apiKey } = params
  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: bytes.toString('base64'),
              },
            },
            { text: EXTRACT_PROMPT },
          ],
        },
      ],
    }),
  })

  const data = (await res.json()) as GeminiResponse

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`)
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim() ?? ''

  return text
}
