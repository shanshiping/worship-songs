import { afterEach, describe, expect, it } from 'vitest'
import {
  getLyricsOcrConfig,
  getLyricsOcrConfigError,
  isLyricsOcrConfigured,
} from '@/lib/lyrics-ocr-config'

const ENV_KEYS = [
  'LYRICS_OCR_PROVIDER',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'LYRICS_OCR_API_KEY',
  'LYRICS_OCR_BASE_URL',
  'LYRICS_OCR_MODEL',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
] as const

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
}

describe('lyrics-ocr-config', () => {
  afterEach(() => {
    clearEnv()
  })

  it('uses gemini when GEMINI_API_KEY is set', () => {
    process.env.GEMINI_API_KEY = 'gemini-key'
    process.env.GEMINI_MODEL = 'gemini-2.5-flash'

    expect(getLyricsOcrConfig()).toEqual({
      provider: 'gemini',
      apiKey: 'gemini-key',
      model: 'gemini-2.5-flash',
    })
  })

  it('uses openai when provider is openai', () => {
    process.env.LYRICS_OCR_PROVIDER = 'openai'
    process.env.LYRICS_OCR_API_KEY = 'openai-key'
    process.env.LYRICS_OCR_BASE_URL = 'https://example.com/v1'
    process.env.LYRICS_OCR_MODEL = 'gpt-4o'

    expect(getLyricsOcrConfig()).toEqual({
      provider: 'openai',
      apiKey: 'openai-key',
      model: 'gpt-4o',
      baseURL: 'https://example.com/v1',
    })
  })

  it('falls back to AI_* for openai provider', () => {
    process.env.LYRICS_OCR_PROVIDER = 'openai'
    process.env.AI_API_KEY = 'shared-key'
    process.env.AI_BASE_URL = 'https://api.openai.com/v1'
    process.env.AI_MODEL = 'gpt-4o-mini'

    expect(getLyricsOcrConfig()).toEqual({
      provider: 'openai',
      apiKey: 'shared-key',
      model: 'gpt-4o-mini',
      baseURL: 'https://api.openai.com/v1',
    })
  })

  it('reports unconfigured state', () => {
    expect(isLyricsOcrConfigured()).toBe(false)
    expect(getLyricsOcrConfigError()).toContain('LYRICS_OCR_PROVIDER')
  })
})
