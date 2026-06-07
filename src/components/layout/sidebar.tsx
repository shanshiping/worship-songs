'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Music,
  LayoutDashboard,
  Calendar,
  Trophy,
  Settings,
  Upload,
  LogOut,
  Users,
  Shield,
  MessageCircle,
  Sparkles,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import { usePermissions } from '@/hooks/use-permissions'

export function Sidebar() {
  const pathname = usePathname()
  const permissions = usePermissions()

  const menuItems = [
    {
      title: '首页',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      title: '歌曲管理',
      href: '/songs',
      icon: Music,
      show: true,
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      title: '聚会记录',
      href: '/meetings',
      icon: Calendar,
      show: true,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: '歌曲排行榜',
      href: '/leaderboard',
      icon: Trophy,
      show: true,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      title: '团队协作',
      href: '/teams',
      icon: MessageCircle,
      show: true,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: '数据管理',
      href: '/data',
      icon: Database,
      show: permissions.isLeaderOrAbove,
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      title: '用户管理',
      href: '/admin/users',
      icon: Users,
      show: permissions.isSuperAdmin,
      gradient: 'from-red-500 to-orange-500',
    },
    {
      title: '设置',
      href: '/settings',
      icon: Settings,
      show: true,
      gradient: 'from-gray-500 to-slate-500',
    },
  ]

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow bg-sidebar overflow-hidden">
        {/* Logo 区域 */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-sidebar-primary/20 to-transparent" />
          <div className="relative flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shadow-lg">
              <Music className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">敬拜选歌</h1>
              <p className="text-xs text-sidebar-foreground/60">Worship Songs</p>
            </div>
          </div>
        </div>

        {/* 用户角色标识 */}
        <div className="mx-4 mb-4">
          <div className="flex items-center space-x-2 px-3 py-2 bg-sidebar-accent/50 rounded-lg border border-sidebar-border/50">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center">
              <Shield className="h-3 w-3 text-sidebar-primary-foreground" />
            </div>
            <span className="text-xs font-medium text-sidebar-foreground/80">
              {permissions.isSuperAdmin && '超级管理员'}
              {permissions.isAdmin && !permissions.isSuperAdmin && '管理员'}
              {permissions.isLeader && !permissions.isAdmin && '领队'}
              {permissions.isMember && !permissions.isLeader && '成员'}
            </span>
            <Sparkles className="h-3 w-3 text-sidebar-primary ml-auto" />
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems
            .filter((item) => item.show)
            .map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-200',
                      isActive
                        ? `bg-gradient-to-br ${item.gradient} shadow-md`
                        : 'bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-white' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                      )}
                    />
                  </div>
                  <span>{item.title}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </Link>
              )
            })}
        </nav>

        {/* 退出按钮 */}
        <div className="p-4 mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center mr-3">
              <LogOut className="h-4 w-4" />
            </div>
            退出登录
          </Button>
        </div>
      </div>
    </aside>
  )
}
