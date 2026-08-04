'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { SongAgentChat } from '@/components/song-agent-chat'
import { useI18n } from '@/components/providers/i18n-provider'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        <Header />
        <main id="main-content" className="animate-fade-in flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <SongAgentChat />
    </div>
  )
}
