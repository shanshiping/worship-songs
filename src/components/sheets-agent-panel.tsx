'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { ChevronDown, ChevronUp, Plus, Send, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AgentSong = {
  id: string
  title: string
  artist?: string | null
  sheetMusic?: string | null
}

type SheetsAgentPanelProps = {
  theme: string
  scripture: string
  onAddSong: (song: AgentSong) => void
  embedded?: boolean
}

function storageKey(userId: string) {
  return `sheets-agent-chat:${userId}`
}

function extractSongsFromPart(part: { type: string; [key: string]: unknown }): AgentSong[] {
  const output = part.output as Record<string, unknown> | undefined
  if (!output) return []

  const collected: AgentSong[] = []

  if (Array.isArray(output.songs)) {
    for (const song of output.songs) {
      if (song && typeof song === 'object' && 'id' in song && 'title' in song) {
        const item = song as AgentSong
        collected.push({
          id: item.id,
          title: item.title,
          artist: item.artist ?? null,
          sheetMusic: item.sheetMusic ?? null,
        })
      }
    }
  }

  if (Array.isArray(output.meetings)) {
    for (const meeting of output.meetings) {
      if (!meeting || typeof meeting !== 'object') continue
      const songs = (meeting as { songs?: AgentSong[] }).songs
      if (!Array.isArray(songs)) continue
      for (const song of songs) {
        if (song?.id && song?.title) {
          collected.push({
            id: song.id,
            title: song.title,
            artist: song.artist ?? null,
            sheetMusic: song.sheetMusic ?? null,
          })
        }
      }
    }
  }

  for (const key of ['directMatches', 'historicalPicks'] as const) {
    const list = output[key]
    if (!Array.isArray(list)) continue
    for (const song of list) {
      if (song && typeof song === 'object' && 'id' in song && 'title' in song) {
        const item = song as AgentSong
        collected.push({
          id: item.id,
          title: item.title,
          artist: item.artist ?? null,
          sheetMusic: item.sheetMusic ?? null,
        })
      }
    }
  }

  const seen = new Set<string>()
  return collected.filter((song) => {
    if (seen.has(song.id)) return false
    seen.add(song.id)
    return true
  })
}

export function SheetsAgentPanel({
  theme,
  scripture,
  onAddSong,
  embedded = false,
}: SheetsAgentPanelProps) {
  const { t } = useI18n()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [expanded, setExpanded] = useState(true)
  const [input, setInput] = useState('')
  const hydratedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/agent/chat',
        body: {
          pageContext: {
            page: 'sheets' as const,
            theme: theme.trim() || undefined,
            scripture: scripture.trim() || undefined,
          },
        },
      }),
    [theme, scripture],
  )

  const { messages, setMessages, sendMessage, status, error, clearError } =
    useChat({
      id: userId ? `sheets-agent-${userId}` : 'sheets-agent',
      transport,
    })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (!userId || hydratedRef.current) return
    hydratedRef.current = true
    try {
      const raw = localStorage.getItem(storageKey(userId))
      if (!raw) return
      const parsed = JSON.parse(raw) as UIMessage[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    } catch {
      // ignore corrupt storage
    }
  }, [userId, setMessages])

  useEffect(() => {
    if (!userId || !hydratedRef.current) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(messages))
    } catch {
      // ignore quota errors
    }
  }, [messages, userId])

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded, status])

  if (!userId) return null

  const clearChat = () => {
    setMessages([])
    clearError()
    try {
      localStorage.removeItem(storageKey(userId))
    } catch {
      // ignore
    }
  }

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    void sendMessage({ text: trimmed })
    setInput('')
  }

  const suggestions = [
    t('sheets.agentSuggestTheme'),
    t('sheets.agentSuggestScripture'),
    t('sheets.agentSuggestSheet'),
  ]

  const panelBody = (
    <>
      {!embedded && (
        <div className="flex items-center justify-end gap-1 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearChat}
            aria-label={t('agent.clear')}
            title={t('agent.clear')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={cn('space-y-3 overflow-y-auto px-1 pb-3', embedded ? 'max-h-[24rem]' : 'max-h-80 px-3')}>
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs hover:bg-muted"
                  onClick={() => submit(text)}
                  disabled={busy}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'max-w-[95%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted text-foreground',
            )}
          >
            {message.parts.map((part, index) => {
              if (part.type === 'text' && part.text) {
                return <div key={`${message.id}-t-${index}`}>{part.text}</div>
              }

              const songs = extractSongsFromPart(
                part as { type: string; [key: string]: unknown },
              )
              if (songs.length > 0) {
                return (
                  <ul key={`${message.id}-songs-${index}`} className="mt-2 space-y-1.5">
                    {songs.map((song) => (
                      <li
                        key={song.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <span className="font-medium">{song.title}</span>
                          {song.artist ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {song.artist}
                            </span>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onAddSong(song)}
                          aria-label={t('sheets.addSong')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )
              }

              return null
            })}
          </div>
        ))}

        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        <div ref={bottomRef} />
      </div>

      <form
        className={cn('flex gap-2 border-t p-2.5', embedded && 'px-0')}
        onSubmit={(event) => {
          event.preventDefault()
          submit(input)
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('sheets.agentPlaceholder')}
          disabled={busy}
          className="min-h-10"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          aria-label={t('agent.send')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  )

  if (embedded) {
    return <div>{panelBody}</div>
  }

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        <div>
          <p className="text-sm font-semibold">{t('sheets.agentTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('sheets.agentSubtitle')}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && <div className="border-t">{panelBody}</div>}
    </div>
  )
}
