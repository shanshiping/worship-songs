'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  const btn = (code: Locale) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      className={cn(
        'px-2 py-1 text-xs font-medium rounded-md transition-colors',
        locale === code
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      aria-pressed={locale === code}
    >
      {t(`lang.${code}`)}
    </button>
  )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border/60 p-0.5',
        className
      )}
      role="group"
      aria-label="Language"
    >
      {btn('en')}
      {btn('zh')}
    </div>
  )
}
