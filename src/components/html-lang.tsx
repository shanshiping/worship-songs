'use client'

import { useEffect } from 'react'
import { useI18n } from '@/components/providers/i18n-provider'
import { htmlLang } from '@/lib/i18n'

export function HtmlLang() {
  const { locale } = useI18n()
  useEffect(() => {
    document.documentElement.lang = htmlLang(locale)
  }, [locale])
  return null
}
