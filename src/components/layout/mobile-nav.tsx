'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
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
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'border-l-2 border-primary bg-sidebar-accent text-sidebar-foreground'
                    : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
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
          <LanguageSwitcher className="w-full justify-center" />
          <Button
            variant="ghost"
            className="min-h-11 w-full justify-start rounded-xl"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t('nav.signOut')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
