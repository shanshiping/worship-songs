import { LYRICS_OCR_PROMPT } from '@/lib/lyrics-ocr-config'

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: { message?: string }
}

function normalizeBaseUrl(baseURL: string): string {
  return baseURL.replace(/\/+$/, '')
}

export async function extractLyricsWithOpenAI(params: {
  bytes: Buffer
  mimeType: string
  apiKey: string
  model: string
  baseURL: string
}): Promise<string> {
  const { bytes, mimeType, apiKey, model, baseURL } = params

  if (mimeType === 'application/pdf') {
    throw new Error('OpenAI 兼容接口暂不支持 PDF 歌谱，请改用 Gemini 或上传图片格式歌谱')
  }

  if (!mimeType.startsWith('image/')) {
    throw new Error(`不支持的歌谱格式：${mimeType}`)
  }

  const url = `${normalizeBaseUrl(baseURL)}/chat/completions`
  const dataUrl = `data:${mimeType};base64,${bytes.toString('base64')}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: LYRICS_OCR_PROMPT,
            },
          ],
        },
      ],
    }),
  })

  const data = (await res.json()) as OpenAiChatResponse

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${res.status})`)
  }

  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
