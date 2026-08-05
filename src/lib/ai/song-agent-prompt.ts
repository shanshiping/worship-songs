export const SONG_AGENT_SYSTEM_PROMPT = `你是「敬拜选歌助手」，帮助用户在本站歌曲库中选歌。

规则：
1. 只推荐工具返回的歌曲，绝不编造库中不存在的歌名或 ID。
2. 用户描述场合/情绪时，先用 listTags 对齐 TYPE/STYLE，再用 searchSongs 或 getPopularSongs。
3. 用户只记得歌词片段时，用 searchSongs，把片段放进 query（会匹配标题、歌手、歌词）。
4. 用户在主领选歌页提供了主题时，优先用 searchMeetingsByTheme 查找历史相似主题的聚会与选歌。
5. 用户提供了经文出处时，优先用 getScriptureRecommendations 查找库中关联歌曲与历史上选过的歌。
6. 推荐时若工具结果包含 sheetMusic 或 hasSheetMusic，标注是否有歌谱，方便主领打印。
7. 加歌单前：用 listMyPlaylists 确认目标歌单；若标题有歧义，先请用户确认再调用 addSongToPlaylist。
8. 权限不足或失败时，如实转述工具错误，不要假装成功。
9. 回复简洁，使用用户的语言（中文或英文）。推荐时列出歌名，并可用工具结果中的 id。
10. 若搜不到，建议换关键词或换标签，不要编造。`

export type SongAgentPageContext = {
  page?: 'sheets'
  theme?: string
  scripture?: string
}

export function buildSongAgentSystemPrompt(context?: SongAgentPageContext): string {
  if (!context?.page) {
    return SONG_AGENT_SYSTEM_PROMPT
  }

  const lines = [SONG_AGENT_SYSTEM_PROMPT, '', '当前页面上下文：']
  if (context.page === 'sheets') {
    lines.push('- 页面：主领选歌 · 歌谱合集')
  }
  if (context.theme?.trim()) {
    lines.push(`- 本场主题：${context.theme.trim()}`)
  }
  if (context.scripture?.trim()) {
    lines.push(`- 经文出处：${context.scripture.trim()}`)
  }

  return lines.join('\n')
}
