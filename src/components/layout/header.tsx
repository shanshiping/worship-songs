'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import { LogOut, Menu, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/components/providers/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { BrandLogo } from '@/components/brand-logo'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: session } = useSession()
  const { t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label={t('nav.openMenu')}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <BrandLogo className="h-8" />
          </div>

          <div className="hidden flex-1 md:block" />

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />

            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={session?.user?.name || t('nav.profile')}
              >
                <div className="relative h-10 w-10 cursor-pointer rounded-xl ring-2 ring-border transition-opacity hover:opacity-80 hover:ring-primary/30">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={''} alt={session?.user?.name || ''} />
                    <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-xl" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-4 font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={''} alt={session?.user?.name || ''} />
                        <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{session?.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/settings" />}
                  className="cursor-pointer rounded-lg"
                >
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                  <span>{t('nav.profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/settings" />}
                  className="cursor-pointer rounded-lg"
                >
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Settings className="h-4 w-4 text-foreground" />
                  </div>
                  <span>{t('nav.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut({ redirect: false })
                    window.location.assign('/login')
                  }}
                  className="cursor-pointer rounded-lg px-2 py-2"
                >
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <LogOut className="h-4 w-4 text-destructive" />
                  </div>
                  <span>{t('nav.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  )
}
