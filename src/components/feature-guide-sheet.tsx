'use client'

import { Sparkles } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { FeatureGuideContent } from '@/components/feature-guide-content'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

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
          <div className="flex items-center gap-2 pr-8 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {t('guide.eyebrow')}
          </div>
          <SheetTitle>{t('guide.title')}</SheetTitle>
          <SheetDescription>{t('guide.subtitle')}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <FeatureGuideContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}
