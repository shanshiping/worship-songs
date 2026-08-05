import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Calendar,
  Database,
  FileScan,
  FileText,
  Globe,
  LayoutDashboard,
  ListMusic,
  MailCheck,
  Mic2,
  Music,
  Share2,
  Sparkles,
  Tags,
  Trophy,
  BookOpen,
  Users,
  Presentation,
} from 'lucide-react'

export type FeatureBadge = 'ai' | 'new' | 'smart'

export type FeatureGuideItem = {
  id: string
  icon: LucideIcon
  titleKey: string
  descKey: string
  tipKeys: string[]
  href?: string
  featured?: boolean
  badge?: FeatureBadge
}

export const FEATURE_GUIDE_ITEMS: FeatureGuideItem[] = [
  {
    id: 'sheets',
    icon: FileText,
    titleKey: 'guide.features.sheets.title',
    descKey: 'guide.features.sheets.desc',
    tipKeys: [
      'guide.features.sheets.tip1',
      'guide.features.sheets.tip2',
      'guide.features.sheets.tip3',
    ],
    href: '/sheets',
    featured: true,
    badge: 'new',
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titleKey: 'guide.features.dashboard.title',
    descKey: 'guide.features.dashboard.desc',
    tipKeys: [
      'guide.features.dashboard.tip1',
      'guide.features.dashboard.tip2',
    ],
    href: '/dashboard',
    featured: true,
    badge: 'new',
  },
  {
    id: 'songAgent',
    icon: Bot,
    titleKey: 'guide.features.songAgent.title',
    descKey: 'guide.features.songAgent.desc',
    tipKeys: [
      'guide.features.songAgent.tip1',
      'guide.features.songAgent.tip2',
      'guide.features.songAgent.tip3',
    ],
    href: '/songs',
    featured: true,
    badge: 'ai',
  },
  {
    id: 'lyricsOcr',
    icon: FileScan,
    titleKey: 'guide.features.lyricsOcr.title',
    descKey: 'guide.features.lyricsOcr.desc',
    tipKeys: [
      'guide.features.lyricsOcr.tip1',
      'guide.features.lyricsOcr.tip2',
    ],
    href: '/song-upload',
    featured: true,
    badge: 'smart',
  },
  {
    id: 'lrcKaraoke',
    icon: Mic2,
    titleKey: 'guide.features.lrcKaraoke.title',
    descKey: 'guide.features.lrcKaraoke.desc',
    tipKeys: [
      'guide.features.lrcKaraoke.tip1',
      'guide.features.lrcKaraoke.tip2',
    ],
    href: '/songs',
    featured: true,
    badge: 'new',
  },
  {
    id: 'tags',
    icon: Tags,
    titleKey: 'guide.features.tags.title',
    descKey: 'guide.features.tags.desc',
    tipKeys: [
      'guide.features.tags.tip1',
      'guide.features.tags.tip2',
      'guide.features.tags.tip3',
    ],
    href: '/songs',
    featured: true,
    badge: 'new',
  },
  {
    id: 'playlists',
    icon: ListMusic,
    titleKey: 'guide.features.playlists.title',
    descKey: 'guide.features.playlists.desc',
    tipKeys: [
      'guide.features.playlists.tip1',
      'guide.features.playlists.tip2',
    ],
    href: '/playlists',
    featured: true,
    badge: 'new',
  },
  {
    id: 'share',
    icon: Share2,
    titleKey: 'guide.features.share.title',
    descKey: 'guide.features.share.desc',
    tipKeys: [
      'guide.features.share.tip1',
      'guide.features.share.tip2',
    ],
    featured: true,
    badge: 'new',
  },
  {
    id: 'songs',
    icon: Music,
    titleKey: 'guide.features.songs.title',
    descKey: 'guide.features.songs.desc',
    tipKeys: [
      'guide.features.songs.tip1',
      'guide.features.songs.tip2',
      'guide.features.songs.tip3',
    ],
    href: '/songs',
  },
  {
    id: 'lyricsSearch',
    icon: Sparkles,
    titleKey: 'guide.features.lyricsSearch.title',
    descKey: 'guide.features.lyricsSearch.desc',
    tipKeys: ['guide.features.lyricsSearch.tip1'],
    href: '/songs',
    featured: true,
    badge: 'smart',
  },
  {
    id: 'scriptures',
    icon: BookOpen,
    titleKey: 'guide.features.scriptures.title',
    descKey: 'guide.features.scriptures.desc',
    tipKeys: [
      'guide.features.scriptures.tip1',
      'guide.features.scriptures.tip2',
    ],
    href: '/song-upload',
    badge: 'new',
  },
  {
    id: 'quickTags',
    icon: Tags,
    titleKey: 'guide.features.quickTags.title',
    descKey: 'guide.features.quickTags.desc',
    tipKeys: ['guide.features.quickTags.tip1'],
    href: '/songs',
    badge: 'smart',
  },
  {
    id: 'meetings',
    icon: Calendar,
    titleKey: 'guide.features.meetings.title',
    descKey: 'guide.features.meetings.desc',
    tipKeys: [
      'guide.features.meetings.tip1',
      'guide.features.meetings.tip2',
    ],
    href: '/meetings',
  },
  {
    id: 'leaderboard',
    icon: Trophy,
    titleKey: 'guide.features.leaderboard.title',
    descKey: 'guide.features.leaderboard.desc',
    tipKeys: ['guide.features.leaderboard.tip1'],
    href: '/leaderboard',
  },
  {
    id: 'teams',
    icon: Users,
    titleKey: 'guide.features.teams.title',
    descKey: 'guide.features.teams.desc',
    tipKeys: [
      'guide.features.teams.tip1',
      'guide.features.teams.tip2',
      'guide.features.teams.tip3',
      'guide.features.teams.tip4',
    ],
    href: '/teams',
    featured: true,
    badge: 'new',
  },
  {
    id: 'emailVerification',
    icon: MailCheck,
    titleKey: 'guide.features.emailVerification.title',
    descKey: 'guide.features.emailVerification.desc',
    tipKeys: [
      'guide.features.emailVerification.tip1',
      'guide.features.emailVerification.tip2',
      'guide.features.emailVerification.tip3',
    ],
    href: '/register',
    badge: 'new',
  },
  {
    id: 'data',
    icon: Database,
    titleKey: 'guide.features.data.title',
    descKey: 'guide.features.data.desc',
    tipKeys: ['guide.features.data.tip1'],
    href: '/data',
  },
  {
    id: 'i18n',
    icon: Globe,
    titleKey: 'guide.features.i18n.title',
    descKey: 'guide.features.i18n.desc',
    tipKeys: ['guide.features.i18n.tip1'],
  },
]

export const FEATURED_ITEMS = FEATURE_GUIDE_ITEMS.filter((f) => f.featured)
export const CORE_ITEMS = FEATURE_GUIDE_ITEMS.filter((f) => !f.featured)
