'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { FeatureGuideItem } from '@/lib/feature-guide'
import { useI18n } from '@/components/providers/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FeatureGuideCardProps = {
  feature: FeatureGuideItem
  featured?: boolean
}

export function FeatureGuideCard({ feature, featured = false }: FeatureGuideCardProps) {
  const { t } = useI18n()
  const Icon = feature.icon

  const badgeLabel = feature.badge ? t(`guide.badges.${feature.badge}`) : null

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md',
        featured
          ? 'border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-background'
          : 'border-border'
      )}
    >
      {featured && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[var(--brand-teal)] to-[var(--brand-gold)]"
          aria-hidden
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              featured ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {badgeLabel && (
            <Badge variant={feature.badge === 'ai' ? 'default' : 'secondary'}>{badgeLabel}</Badge>
          )}
        </div>
        <CardTitle className={cn('text-lg leading-snug', featured && 'text-foreground')}>
          {t(feature.titleKey)}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{t(feature.descKey)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {feature.tipKeys.map((key) => (
            <li key={key} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        {feature.href && (
          <Link
            href={feature.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:underline"
          >
            {t('guide.tryIt')}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
