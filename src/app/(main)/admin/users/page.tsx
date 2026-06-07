'use client'

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

const roleOptions = [
  { value: 'SUPER_ADMIN', label: '超级管理员', description: '所有权限' },
  { value: 'ADMIN', label: '管理员', description: '编辑、上传、下载、删除' },
  { value: 'LEADER', label: '领队', description: '编辑、上传、下载' },
  { value: 'MEMBER', label: '成员', description: '只能下载' },
]

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500',
  ADMIN: 'bg-orange-500',
  LEADER: 'bg-blue-500',
  MEMBER: 'bg-gray-500',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  LEADER: '领队',
  MEMBER: '成员',
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session?.user?.role !== 'SUPER_ADMIN') {
      toast.error('权限不足，只有超级管理员可以访问此页面')
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
        toast.error(data.error || '获取用户列表失败')
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === session?.user?.id) {
      toast.error('不能修改自己的角色')
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
        toast.success('用户角色已更新')
      } else {
        const data = await response.json()
        toast.error(data.error || '更新失败')
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
      toast.error('更新失败')
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
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
          <p className="text-muted-foreground">管理用户角色和权限</p>
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
                {users.filter(u => u.role === role.value).length} 人
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            用户列表
          </CardTitle>
          <CardDescription>
            点击下拉菜单修改用户角色
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
                    <p className="font-medium">{user.name || '未设置姓名'}</p>
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
                    <span className="text-sm text-muted-foreground">（当前用户）</span>
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
