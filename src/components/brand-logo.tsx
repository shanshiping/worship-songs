'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className, priority }: BrandLogoProps) {
  const { t } = useI18n()
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      src="/brand/logo.png"
      alt={t('brand.name')}
      width={160}
      height={80}
      decoding="async"
      {...(priority ? { fetchPriority: 'high' as const } : {})}
      className={cn('h-10 w-auto object-contain object-left', className)}
    />
  )
}
