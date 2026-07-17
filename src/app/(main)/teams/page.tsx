'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Settings, MessageCircle, Crown, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
  _count: {
    members: number
    messages: number
  }
}

export default function TeamsPage() {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    fetchTeams()
  }, [status])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('teams.enterName'))
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newTeam = await response.json()
        setTeams([newTeam, ...teams])
        setShowCreateForm(false)
        setFormData({ name: '', description: '' })
        toast.success(t('teams.createSuccess'))
      } else {
        const data = await response.json()
        toast.error(data.error || t('teams.createFailed'))
      }
    } catch (error) {
      toast.error(t('teams.createFailed'))
    } finally {
      setCreating(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('teams.title')}</h1>
          <p className="text-muted-foreground">{t('teams.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('teams.createTeam')}
        </Button>
      </div>

      {/* teams.createTeam表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('teams.createNew')}</CardTitle>
            <CardDescription>{t('teams.createDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">{t('teams.nameRequired')}</Label>
                <Input
                  id="team-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="{t('teams.namePlaceholder')}"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-desc">{t('teams.desc')}</Label>
                <Textarea
                  id="team-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="{t('teams.descPlaceholder')}"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={creating}>
                  {creating ? t('teams.creating') : t('teams.create')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  {t('teams.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 团队列表 */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('teams.noTeams')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('teams.noTeamsHint')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {team.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {team.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {t('teams.membersCount', { count: team._count.members })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* 成员列表 */}
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                        title={member.user.name || member.user.email}
                      >
                        {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {team.members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-muted-foreground">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>

                  {/* 统计 */}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MessageCircle className="mr-1 h-4 w-4" />
                      {t('teams.messagesCount', { count: team._count.messages })}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    <Link href={`/teams/${team.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        {t('teams.enterTeam')}
                      </Button>
                    </Link>
                    {team.ownerId === session?.user?.id && (
                      <Link href={`/teams/${team.id}/settings`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
