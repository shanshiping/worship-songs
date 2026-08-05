'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'

type ThemeOption = 'light' | 'dark' | 'system'

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const options: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t('theme.light') },
    { value: 'dark', icon: Moon, label: t('theme.dark') },
    { value: 'system', icon: Monitor, label: t('theme.system') },
  ]

  const active = (mounted ? theme : 'system') as ThemeOption

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border/60 p-0.5',
        className
      )}
      role="group"
      aria-label={t('theme.label')}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex min-h-7 min-w-7 items-center justify-center rounded-md px-1.5 transition-colors',
            active === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-pressed={active === value}
          aria-label={label}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
      {!mounted && (
        <span className="sr-only" aria-live="polite">
          {resolvedTheme === 'dark' ? t('theme.dark') : t('theme.light')}
        </span>
      )}
    </div>
  )
}
