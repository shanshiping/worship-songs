export const LYRICS_OCR_PROMPT = `Extract only the sung lyric lines from this sheet music image or PDF.
Rules:
- Output plain text lyrics only, one lyric line per line.
- Omit musical notation, chord symbols, clefs, measure numbers, page headers/footers, and titles/artist if they are not lyric lines.
- Preserve the original language of the lyrics.
- If no lyrics are found, return an empty string.`

export type LyricsOcrProvider = 'gemini' | 'openai'

export type LyricsOcrConfig = {
  provider: LyricsOcrProvider
  apiKey: string
  model: string
  baseURL?: string
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function resolveProvider(): LyricsOcrProvider | null {
  const explicit = readEnv('LYRICS_OCR_PROVIDER')?.toLowerCase()
  if (explicit === 'gemini' || explicit === 'openai') {
    return explicit
  }

  if (readEnv('GEMINI_API_KEY')) return 'gemini'
  if (readEnv('LYRICS_OCR_API_KEY') || readEnv('AI_API_KEY')) return 'openai'
  return null
}

export function getLyricsOcrConfig(): LyricsOcrConfig | null {
  const provider = resolveProvider()
  if (!provider) return null

  if (provider === 'gemini') {
    const apiKey = readEnv('GEMINI_API_KEY')
    if (!apiKey) return null
    return {
      provider,
      apiKey,
      model: readEnv('GEMINI_MODEL') || readEnv('LYRICS_OCR_MODEL') || DEFAULT_GEMINI_MODEL,
    }
  }

  const apiKey = readEnv('LYRICS_OCR_API_KEY') || readEnv('AI_API_KEY')
  if (!apiKey) return null

  return {
    provider,
    apiKey,
    model:
      readEnv('LYRICS_OCR_MODEL') ||
      readEnv('AI_MODEL') ||
      DEFAULT_OPENAI_MODEL,
    baseURL:
      readEnv('LYRICS_OCR_BASE_URL') ||
      readEnv('AI_BASE_URL') ||
      DEFAULT_OPENAI_BASE_URL,
  }
}

export function isLyricsOcrConfigured(): boolean {
  return getLyricsOcrConfig() !== null
}

export function getLyricsOcrConfigError(): string {
  const provider = resolveProvider()
  if (provider === 'gemini') {
    return '未配置 GEMINI_API_KEY，无法识别歌谱歌词'
  }
  if (provider === 'openai') {
    return '未配置 LYRICS_OCR_API_KEY 或 AI_API_KEY，无法识别歌谱歌词'
  }
  return '未配置歌谱 OCR（请设置 LYRICS_OCR_PROVIDER 及对应 API Key）'
}
