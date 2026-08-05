import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  htmlLang,
  isLocale,
  parseLocaleCookieHeader,
  translate,
} from '@/lib/i18n'

describe('i18n helpers', () => {
  it('validates locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('zh')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('maps html lang', () => {
    expect(htmlLang('en')).toBe('en')
    expect(htmlLang('zh')).toBe('zh-CN')
  })

  it('translates known keys and falls back to key', () => {
    expect(translate('en', 'common.loading')).toBeTruthy()
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist')
  })

  it('interpolates params', () => {
    expect(translate('en', 'dashboard.moreSongs', { count: 3 })).toBe(
      '+3 more'
    )
  })

  it('parses locale cookie header', () => {
    expect(parseLocaleCookieHeader(null)).toBe(DEFAULT_LOCALE)
    expect(parseLocaleCookieHeader('locale=zh')).toBe('zh')
    expect(parseLocaleCookieHeader('locale=fr')).toBe(DEFAULT_LOCALE)
  })
})
