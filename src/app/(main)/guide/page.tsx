'use client'

import { Sparkles } from 'lucide-react'
import { useI18n } from '@/components/providers/i18n-provider'
import { FeatureGuideCard } from '@/components/feature-guide-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CORE_ITEMS, FEATURED_ITEMS, FEATURE_GUIDE_ITEMS } from '@/lib/feature-guide'

export default function GuidePage() {
  const { t } = useI18n()

  return (
    <div className="space-y-8">
      <div className="animate-fade-in space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          {t('guide.eyebrow')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('guide.title')}</h1>
        <p className="max-w-2xl text-muted-foreground">{t('guide.subtitle')}</p>
      </div>

      <section className="animate-fade-in space-y-4" style={{ animationDelay: '80ms' }}>
        <div>
          <h2 className="text-xl font-semibold">{t('guide.featuredTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('guide.featuredDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURED_ITEMS.map((feature) => (
            <FeatureGuideCard key={feature.id} feature={feature} featured />
          ))}
        </div>
      </section>

      <section className="animate-fade-in space-y-4" style={{ animationDelay: '160ms' }}>
        <div>
          <h2 className="text-xl font-semibold">{t('guide.allModulesTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('guide.allModulesDesc')}</p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">{t('guide.tabAll')}</TabsTrigger>
            <TabsTrigger value="featured">{t('guide.tabFeatured')}</TabsTrigger>
            <TabsTrigger value="core">{t('guide.tabCore')}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_GUIDE_ITEMS.map((feature) => (
                <FeatureGuideCard key={feature.id} feature={feature} featured={feature.featured} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="featured" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_ITEMS.map((feature) => (
                <FeatureGuideCard key={feature.id} feature={feature} featured />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="core" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_ITEMS.map((feature) => (
                <FeatureGuideCard key={feature.id} feature={feature} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <section
        className="animate-fade-in rounded-xl border border-border bg-muted/40 p-6"
        style={{ animationDelay: '240ms' }}
      >
        <h2 className="text-lg font-semibold">{t('guide.agentHintTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('guide.agentHintDesc')}</p>
      </section>
    </div>
  )
}
