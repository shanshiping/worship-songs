'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { MessageCircle, Send, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SongCard = {
  id: string
  title: string
  artist?: string | null
  tags?: { name: string; kind: string }[]
}

function storageKey(userId: string) {
  return `song-agent-chat:${userId}`
}

function extractSongsFromPart(part: { type: string; [key: string]: unknown }): SongCard[] {
  if (
    part.type !== 'tool-searchSongs' &&
    part.type !== 'tool-getPopularSongs'
  ) {
    return []
  }

  const output = part.output as
    | { songs?: SongCard[] }
    | undefined
  if (!output?.songs || !Array.isArray(output.songs)) return []
  return output.songs.filter((s) => s?.id && s?.title)
}

export function SongAgentChat() {
  const { t } = useI18n()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const hydratedRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/agent/chat' }),
    []
  )

  const { messages, setMessages, sendMessage, status, error, clearError } =
    useChat({
      id: userId ? `song-agent-${userId}` : 'song-agent',
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
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open, status])

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
    t('agent.suggestOccasion'),
    t('agent.suggestLyrics'),
    t('agent.suggestPlaylist'),
  ]

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <div
          className={cn(
            'pointer-events-auto flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl',
            'h-[min(70vh,520px)]'
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('agent.title')}
              </p>
              <p className="text-xs text-muted-foreground">{t('agent.subtitle')}</p>
            </div>
            <div className="flex items-center gap-1">
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
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label={t('agent.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('agent.emptyHint')}
                </p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
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
                    : 'mr-auto bg-muted text-foreground'
                )}
              >
                {message.parts.map((part, i) => {
                  if (part.type === 'text' && part.text) {
                    return (
                      <div key={`${message.id}-t-${i}`}>{part.text}</div>
                    )
                  }

                  const songs = extractSongsFromPart(
                    part as { type: string; [key: string]: unknown }
                  )
                  if (songs.length > 0) {
                    return (
                      <ul
                        key={`${message.id}-songs-${i}`}
                        className="mt-2 space-y-1.5"
                      >
                        {songs.map((song) => (
                          <li key={song.id}>
                            <Link
                              href={`/songs/${song.id}`}
                              className="block rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 hover:border-primary/40"
                            >
                              <span className="font-medium">{song.title}</span>
                              {song.artist ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {song.artist}
                                </span>
                              ) : null}
                              {song.tags && song.tags.length > 0 ? (
                                <span className="mt-1 block text-[10px] text-muted-foreground">
                                  {song.tags.map((tg) => tg.name).join(' · ')}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )
                  }

                  return null
                })}
              </div>
            ))}

            {error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2 border-t border-border p-2.5"
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('agent.placeholder')}
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
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        className="pointer-events-auto rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('agent.close') : t('agent.open')}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  )
}
