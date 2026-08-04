import { extractLyricsWithGemini } from '@/lib/gemini-lyrics'
import {
  getLyricsOcrConfig,
  type LyricsOcrConfig,
} from '@/lib/lyrics-ocr-config'
import { extractLyricsWithOpenAI } from '@/lib/openai-lyrics'

export async function extractLyricsFromSheet(params: {
  bytes: Buffer
  mimeType: string
  config?: LyricsOcrConfig
}): Promise<string> {
  const config = params.config ?? getLyricsOcrConfig()
  if (!config) {
    throw new Error('Lyrics OCR is not configured')
  }

  if (config.provider === 'gemini') {
    return extractLyricsWithGemini({
      bytes: params.bytes,
      mimeType: params.mimeType,
      apiKey: config.apiKey,
      model: config.model,
    })
  }

  return extractLyricsWithOpenAI({
    bytes: params.bytes,
    mimeType: params.mimeType,
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL || 'https://api.openai.com/v1',
  })
}
