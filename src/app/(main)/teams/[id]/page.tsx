'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, Users, Crown, Shield, User, MessageCircle, Music2, X } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  description: string | null
  ownerId: string
  owner: {
    id: string
    name: string
    email: string
  }
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
      avatar: string | null
    }
  }>
  messages: Array<{
    id: string
    content: string
    type: string
    createdAt: string
    user: {
      id: string
      name: string
      avatar: string | null
    }
  }>
}

interface TeamSong {
  id: string
  sharedAt: string
  sharedById: string
  song: {
    id: string
    title: string
    artist: string | null
    key: string | null
    coverImage: string | null
  }
  sharedBy: {
    id: string
    name: string | null
    email: string
  }
}

export default function TeamDetailPage() {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'zh' ? zhCN : enUS
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSongs, setShowSongs] = useState(false)
  const [sharedSongs, setSharedSongs] = useState<TeamSong[]>([])
  const [loadingSongs, setLoadingSongs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTeam()
  }, [params.id])

  useEffect(() => {
    scrollToBottom()
  }, [team?.messages])

  useEffect(() => {
    if (showSongs) {
      void fetchSharedSongs()
    }
  }, [showSongs, params.id])

  const fetchSharedSongs = async () => {
    setLoadingSongs(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/songs`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSharedSongs(data)
      }
    } catch (error) {
      console.error('Failed to fetch shared songs:', error)
    } finally {
      setLoadingSongs(false)
    }
  }

  const handleRemoveSong = async (songId: string) => {
    if (!confirm(t('teams.removeSharedSongConfirm'))) return

    try {
      const response = await fetch(
        `/api/teams/${params.id}/songs?songId=${encodeURIComponent(songId)}`,
        { method: 'DELETE', credentials: 'include' }
      )
      if (response.ok) {
        setSharedSongs((prev) => prev.filter((item) => item.song.id !== songId))
        toast.success(t('teams.removeSharedSongSuccess'))
      } else {
        const data = await response.json()
        toast.error(data.error || t('teams.removeSharedSongFailed'))
      }
    } catch {
      toast.error(t('teams.removeSharedSongFailed'))
    }
  }

  const canRemoveSong = (item: TeamSong) => {
    if (!session?.user?.id || !team) return false
    const member = team.members.find((m) => m.user.id === session.user.id)
    return (
      item.sharedById === session.user.id ||
      member?.role === 'OWNER' ||
      member?.role === 'ADMIN'
    )
  }

  const toggleMembers = () => {
    setShowMembers((prev) => !prev)
    setShowSongs(false)
  }

  const toggleSongs = () => {
    setShowSongs((prev) => !prev)
    setShowMembers(false)
  }

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setTeam(data)
      } else {
        toast.error(t('teams.loadFailed'))
        router.push('/teams')
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/teams/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      })

      if (response.ok) {
        const newMessage = await response.json()
        setTeam(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
        } : null)
        setMessage('')
      } else {
        toast.error(t('teams.sendFailed'))
      }
    } catch (error) {
      toast.error(t('teams.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER':
        return t('teams.owner')
      case 'ADMIN':
        return t('teams.admin')
      default:
        return t('teams.member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
          <Link href="/teams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{team.name}</h1>
            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={toggleSongs}>
            <Music2 className="mr-2 h-4 w-4" />
            {t('teams.sharedSongs')}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleMembers}>
            <Users className="mr-2 h-4 w-4" />
            {t('teams.membersCount', { count: team.members.length })}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 聊天区域 */}
        <div className="flex-1 flex flex-col">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {team.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4" />
                <p>{t('teams.noMessages')}</p>
                <p className="text-sm">{t('teams.noMessagesHint')}</p>
              </div>
            ) : (
              team.messages.map((msg) => {
                const isOwn = msg.user.id === session?.user?.id
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-[70%]`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                          {msg.user.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 px-1">
                            {msg.user.name || t('teams.anonymous')}
                          </p>
                        )}
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 消息输入 */}
          <div className="p-4 border-t bg-white">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('teams.messagePlaceholder')}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* 成员列表侧边栏 */}
        {showMembers && (
          <div className="w-64 border-l bg-white overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-4">{t('teams.teamMembers')}</h3>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name || t('teams.noName')}
                      </p>
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(member.role)}
                        <span className="text-xs text-muted-foreground">
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 共享歌曲侧边栏 */}
        {showSongs && (
          <div className="w-72 border-l bg-white overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('teams.sharedSongs')}</h3>
                <span className="text-xs text-muted-foreground">
                  {t('teams.sharedSongsCount', { count: sharedSongs.length })}
                </span>
              </div>
              {loadingSongs ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : sharedSongs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{t('teams.noSharedSongs')}</p>
                  <p className="text-xs mt-1">{t('teams.noSharedSongsHint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sharedSongs.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg hover:bg-gray-50 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/songs/${item.song.id}`} className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{item.song.title}</p>
                          {item.song.artist && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.song.artist}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('teams.sharedBy', {
                              name: item.sharedBy.name || item.sharedBy.email,
                            })}
                          </p>
                        </Link>
                        {canRemoveSong(item) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveSong(item.song.id)}
                            title={t('teams.removeSharedSong')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
