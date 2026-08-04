import {
  Music,
  LayoutDashboard,
  Calendar,
  Trophy,
  Settings,
  Users,
  MessageCircle,
  Database,
  ListMusic,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  show: boolean
}

type Translate = (key: string) => string

type Perms = {
  isLeaderOrAbove: boolean
  isSuperAdmin: boolean
}

export function getNavItems(t: Translate, permissions: Perms): NavItem[] {
  return [
    { title: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, show: true },
    { title: t('nav.songs'), href: '/songs', icon: Music, show: true },
    { title: t('nav.playlists'), href: '/playlists', icon: ListMusic, show: true },
    { title: t('nav.meetings'), href: '/meetings', icon: Calendar, show: true },
    { title: t('nav.leaderboard'), href: '/leaderboard', icon: Trophy, show: true },
    { title: t('nav.teams'), href: '/teams', icon: MessageCircle, show: true },
    { title: t('nav.data'), href: '/data', icon: Database, show: permissions.isLeaderOrAbove },
    { title: t('nav.adminUsers'), href: '/admin/users', icon: Users, show: permissions.isSuperAdmin },
    { title: t('nav.settings'), href: '/settings', icon: Settings, show: true },
  ]
}
