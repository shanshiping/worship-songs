import { LYRICS_OCR_PROMPT } from '@/lib/lyrics-ocr-config'

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
  error?: { message?: string }
}

export async function extractLyricsWithGemini(params: {
  bytes: Buffer
  mimeType: string
  apiKey: string
  model: string
}): Promise<string> {
  const { bytes, mimeType, apiKey, model } = params
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

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
            { text: LYRICS_OCR_PROMPT },
          ],
        },
      ],
    }),
  })

  const data = (await res.json()) as GeminiResponse

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`)
  }

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  )
}

/** @deprecated Use extractLyricsFromSheet from @/lib/lyrics-ocr */
export async function extractLyricsFromSheet(params: {
  bytes: Buffer
  mimeType: string
  apiKey: string
  model?: string
}): Promise<string> {
  return extractLyricsWithGemini({
    ...params,
    model: params.model || 'gemini-2.0-flash',
  })
}
