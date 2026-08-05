'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-primary text-primary-foreground',
  ADMIN: 'bg-accent text-accent-foreground',
  LEADER: 'bg-secondary text-secondary-foreground',
  MEMBER: 'bg-muted text-muted-foreground',
}

export default function UsersPage() {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const roleOptions = [
    { value: 'SUPER_ADMIN', label: t('roles.SUPER_ADMIN'), description: t('admin.roleSuperAdminDesc') },
    { value: 'ADMIN', label: t('roles.ADMIN'), description: t('admin.roleAdminDesc') },
    { value: 'LEADER', label: t('roles.LEADER'), description: t('admin.roleLeaderDesc') },
    { value: 'MEMBER', label: t('roles.MEMBER'), description: t('admin.roleMemberDesc') },
  ]

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: t('roles.SUPER_ADMIN'),
    ADMIN: t('roles.ADMIN'),
    LEADER: t('roles.LEADER'),
    MEMBER: t('roles.MEMBER'),
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.role !== 'SUPER_ADMIN') {
      toast.error(t('admin.noAccess'))
      router.push('/dashboard')
      return
    }

    fetchUsers()
  }, [session, status])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        const data = await response.json()
        toast.error(data.error || t('admin.loadFailed'))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error(t('admin.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === session?.user?.id) {
      toast.error(t('admin.cannotChangeSelf'))
      return
    }

    setUpdating(userId)

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(users.map(u => u.id === userId ? { ...u, role: updatedUser.role } : u))
        toast.success(t('admin.roleUpdated'))
      } else {
        const data = await response.json()
        toast.error(data.error || t('admin.updateFailed'))
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
      toast.error(t('admin.updateFailed'))
    } finally {
      setUpdating(null)
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
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.title')}</h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {roleOptions.map((role) => (
          <Card key={role.value}>
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{role.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{role.description}</p>
              <Badge className={`mt-2 ${roleColors[role.value]} text-white`}>
                {t('admin.people', { count: users.filter(u => u.role === role.value).length })}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            {t('admin.userList')}
          </CardTitle>
          <CardDescription>
            {t('admin.userListDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.name || t('admin.noName')}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge className={`${roleColors[user.role]} text-white`}>
                    {roleLabels[user.role]}
                  </Badge>

                  {user.id !== session?.user?.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updating === user.id}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('admin.currentUser')}</span>
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
