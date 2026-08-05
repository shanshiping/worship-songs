import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSongAgentModel, isAiConfigured } from '@/lib/ai/provider'
import { buildSongAgentSystemPrompt, type SongAgentPageContext } from '@/lib/ai/song-agent-prompt'
import { createSongAgentTools } from '@/lib/ai/song-agent-tools'

const MAX_MESSAGES = 40

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: '选歌助手暂不可用：未配置 AI_API_KEY' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const messages = Array.isArray(body?.messages)
      ? (body.messages as UIMessage[])
      : []
    const pageContext =
      body?.pageContext && typeof body.pageContext === 'object'
        ? (body.pageContext as SongAgentPageContext)
        : undefined

    const truncated = messages.slice(-MAX_MESSAGES)

    const result = streamText({
      model: getSongAgentModel(),
      system: buildSongAgentSystemPrompt(pageContext),
      messages: await convertToModelMessages(truncated),
      tools: createSongAgentTools(),
      stopWhen: isStepCount(5),
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  } catch (error) {
    console.error('Song agent chat error:', error)
    return NextResponse.json(
      { error: '选歌助手请求失败' },
      { status: 500 }
    )
  }
}
