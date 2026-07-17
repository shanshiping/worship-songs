'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Shield } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/components/providers/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getNavItems } from '@/lib/nav-items'

export function Sidebar() {
  const pathname = usePathname()
  const permissions = usePermissions()
  const { t } = useI18n()
  const menuItems = getNavItems(t, permissions)

  const roleLabel = permissions.isSuperAdmin
    ? t('roles.SUPER_ADMIN')
    : permissions.isAdmin
      ? t('roles.ADMIN')
      : permissions.isLeader
        ? t('roles.LEADER')
        : t('roles.MEMBER')

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-64 md:flex-col">
      <div className="flex flex-1 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
        <div className="space-y-1 px-5 pt-6 pb-4">
          <BrandLogo priority className="h-12" />
          <p className="text-sm font-semibold text-sidebar-foreground">{t('brand.name')}</p>
          <p className="text-xs text-muted-foreground">{t('brand.tagline')}</p>
        </div>

        <div className="mx-4 mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-muted/60 px-3 py-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-sidebar-foreground/80">{roleLabel}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {menuItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'border-l-2 border-primary bg-sidebar-accent text-sidebar-foreground'
                      : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span>{item.title}</span>
                </Link>
              )
            })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
          <LanguageSwitcher className="w-full justify-center" />
          <Button
            variant="ghost"
            className="min-h-11 w-full justify-start rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t('nav.signOut')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
