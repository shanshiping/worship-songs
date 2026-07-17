'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserPlus, Crown, Shield, User, Trash, Loader2, Mail, Save } from 'lucide-react'
import Link from 'next/link'
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
    userId: string
    user: {
      id: string
      name: string
      email: string
      avatar: string | null
    }
  }>
}

export default function TeamSettingsPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  const roleOptions = [
    { value: 'ADMIN', label: t('teams.admin'), description: t('teams.roleAdminDesc') },
    { value: 'MEMBER', label: t('teams.member'), description: t('teams.roleMemberDesc') },
  ]
  const [saving, setSaving] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('MEMBER')
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')

  useEffect(() => {
    fetchTeam()
  }, [params.id])

  const fetchTeam = async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/teams/${id}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTeam(data)
        setTeamName(data.name)
        setTeamDescription(data.description || '')
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

  // 更新teams.teamInfo
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) {
      toast.error(t('teams.enterName'))
      return
    }

    setSaving(true)
    try {
      const { id } = await params
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      })

      if (response.ok) {
        toast.success(t('teams.updated'))
      } else {
        const data = await response.json()
        toast.error(data.error || t('teams.updateFailed'))
      }
    } catch (error) {
      toast.error(t('teams.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  // teams.addMember
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) {
      toast.error(t('teams.enterEmail'))
      return
    }

    setAddingMember(true)
    try {
      const { id } = await params
      const response = await fetch(`/api/teams/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(t('teams.memberAdded'))
        setNewMemberEmail('')
        setNewMemberRole('MEMBER')
        // 刷新团队数据
        fetchTeam()
      } else {
        toast.error(data.error || t('teams.addFailed'))
      }
    } catch (error) {
      toast.error(t('teams.addFailed'))
    } finally {
      setAddingMember(false)
    }
  }

  // 删除成员
  const handleRemoveMember = async (userId: string) => {
    if (!confirm(t('teams.removeConfirm'))) {
      return
    }

    try {
      const { id } = await params
      const response = await fetch(`/api/teams/${id}/members?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success(t('teams.memberRemoved'))
        fetchTeam()
      } else {
        const data = await response.json()
        toast.error(data.error || t('teams.removeFailed'))
      }
    } catch (error) {
      toast.error(t('teams.removeFailed'))
    }
  }

  // 更新成员teams.role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { id } = await params
      const response = await fetch(`/api/teams/${id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      })

      if (response.ok) {
        toast.success(t('teams.roleUpdated'))
        fetchTeam()
      } else {
        const data = await response.json()
        toast.error(data.error || t('teams.updateFailed'))
      }
    } catch (error) {
      toast.error(t('teams.updateFailed'))
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      default:
        return 'outline'
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

  const isOwner = team.ownerId === session?.user?.id

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center space-x-4 animate-fade-in">
        <Link href={`/teams/${team.id}`}>
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('teams.back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">{t('teams.settingsTitle')}</span>
          </h1>
          <p className="text-muted-foreground">{team.name}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* teams.teamInfo */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle>{t('teams.teamInfo')}</CardTitle>
            <CardDescription>{t('teams.teamInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">{t('teams.nameRequired')}</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  disabled={!isOwner}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamDesc">{t('teams.desc')}</Label>
                <Input
                  id="teamDesc"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="{t('teams.descPlaceholder')}"
                  disabled={!isOwner}
                  className="h-11 rounded-xl input-focus"
                />
              </div>
              {isOwner && (
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('teams.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('teams.saveChanges')}
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* teams.addMember */}
        <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>{t('teams.addMember')}</span>
            </CardTitle>
            <CardDescription>{t('teams.addMemberDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberEmail">{t('teams.memberEmail')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="memberEmail"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="{t('teams.memberEmailPlaceholder')}"
                    required
                    className="pl-10 h-11 rounded-xl input-focus"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberRole">{t('teams.role')}</Label>
                <select
                  id="memberRole"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full h-11 px-3 border rounded-xl input-focus"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                disabled={addingMember}
                className="w-full rounded-xl"
              >
                {addingMember ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('teams.adding')}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('teams.addMember')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 成员列表 */}
      <Card className="animate-fade-in border-0 shadow-sm" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle>{t('teams.membersTitle')}</CardTitle>
          <CardDescription>
            {t('teams.membersTotal', { count: team.members.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
                    {member.user.name?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.user.name || t('teams.noName')}
                      {member.userId === session?.user?.id && (
                        <span className="text-xs text-muted-foreground ml-2">{t('teams.me')}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(member.role)}
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>
                  {isOwner && member.role !== 'OWNER' && member.userId !== session?.user?.id && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                        className="h-8 px-2 text-sm border rounded-lg"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
