import { describe, expect, it } from 'vitest'
import {
  buildSongAgentSystemPrompt,
  SONG_AGENT_SYSTEM_PROMPT,
} from '@/lib/ai/song-agent-prompt'

describe('buildSongAgentSystemPrompt', () => {
  it('returns base prompt without context', () => {
    expect(buildSongAgentSystemPrompt()).toBe(SONG_AGENT_SYSTEM_PROMPT)
  })

  it('includes sheets page context', () => {
    const prompt = buildSongAgentSystemPrompt({
      page: 'sheets',
      theme: '复活节',
      scripture: '约翰福音 3:16',
    })

    expect(prompt).toContain('主领选歌 · 歌谱合集')
    expect(prompt).toContain('复活节')
    expect(prompt).toContain('约翰福音 3:16')
  })
})
