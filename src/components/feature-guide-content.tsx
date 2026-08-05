'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { FeatureGuideCard } from '@/components/feature-guide-card'
import { FEATURE_GUIDE_ITEMS } from '@/lib/feature-guide'

const HINT_KEYS = [
  { titleKey: 'guide.teamsHintTitle', descKey: 'guide.teamsHintDesc' },
  { titleKey: 'guide.registerHintTitle', descKey: 'guide.registerHintDesc' },
  { titleKey: 'guide.agentHintTitle', descKey: 'guide.agentHintDesc' },
] as const

export function FeatureGuideContent() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {FEATURE_GUIDE_ITEMS.map((feature) => (
          <FeatureGuideCard key={feature.id} feature={feature} featured={feature.featured} />
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
        {HINT_KEYS.map(({ titleKey, descKey }) => (
          <div key={titleKey}>
            <h3 className="text-sm font-semibold">{t(titleKey)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
