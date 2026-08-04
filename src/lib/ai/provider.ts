import { createOpenAI } from '@ai-sdk/openai'

export function isAiConfigured(): boolean {
  const key = process.env.AI_API_KEY?.trim()
  if (!key) return false
  // Placeholder from .env template — not a real key
  if (key === 'gsk_REPLACE_ME' || key.includes('REPLACE_ME')) return false
  return true
}

export function getSongAgentModel() {
  const apiKey = process.env.AI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured')
  }

  const baseURL = process.env.AI_BASE_URL?.trim() || undefined
  const modelId = process.env.AI_MODEL?.trim() || 'llama-3.3-70b-versatile'

  const provider = createOpenAI({
    apiKey,
    baseURL,
  })

  return provider(modelId)
}
