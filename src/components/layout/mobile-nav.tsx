'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useI18n } from '@/components/providers/i18n-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { getNavItems } from '@/lib/nav-items'

type MobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const permissions = usePermissions()
  const items = getNavItems(t, permissions).filter((item) => item.show)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="sr-only">{t('brand.name')}</SheetTitle>
          <BrandLogo className="h-12" />
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')}
                />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border p-4">
          <ThemeSwitcher className="w-full justify-center" />
          <LanguageSwitcher className="w-full justify-center" />
          <Button
            variant="ghost"
            className="min-h-10 w-full justify-start"
            onClick={async () => {
              await signOut({ redirect: false })
              window.location.assign('/login')
            }}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t('nav.signOut')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
