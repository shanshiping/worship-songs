'use client'

import { Sparkles } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { FeatureGuideCard } from '@/components/feature-guide-card'
import { FEATURE_GUIDE_ITEMS } from '@/lib/feature-guide'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const HINT_KEYS = [
  { titleKey: 'guide.teamsHintTitle', descKey: 'guide.teamsHintDesc' },
  { titleKey: 'guide.registerHintTitle', descKey: 'guide.registerHintDesc' },
  { titleKey: 'guide.agentHintTitle', descKey: 'guide.agentHintDesc' },
] as const

type FeatureGuideSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeatureGuideSheet({ open, onOpenChange }: FeatureGuideSheetProps) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2 text-sm font-medium text-primary pr-8">
            <Sparkles className="h-4 w-4" />
            {t('guide.eyebrow')}
          </div>
          <SheetTitle>{t('guide.title')}</SheetTitle>
          <SheetDescription>{t('guide.subtitle')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div className="grid gap-4">
            {FEATURE_GUIDE_ITEMS.map((feature) => (
              <FeatureGuideCard
                key={feature.id}
                feature={feature}
                featured={feature.featured}
              />
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
            {HINT_KEYS.map(({ titleKey, descKey }) => (
              <div key={titleKey}>
                <h3 className="text-sm font-semibold">{t(titleKey)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
