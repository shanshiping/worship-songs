'use client'

import { Sparkles } from 'lucide-react'
import { FeatureGuideContent } from '@/components/feature-guide-content'
import { useI18n } from '@/components/providers/i18n-provider'

export default function GuidePage() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          {t('guide.eyebrow')}
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('guide.title')}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t('guide.subtitle')}</p>
      </div>
      <FeatureGuideContent />
    </div>
  )
}
