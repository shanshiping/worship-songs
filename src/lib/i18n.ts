import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

export type Locale = 'en' | 'zh'
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'locale'
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365

const catalogs = { en, zh } as const

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'zh'
}

export function htmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

export function getNested(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = getNested(catalogs[locale], key)
  if (text == null) text = getNested(catalogs[DEFAULT_LOCALE], key)
  if (text == null) return key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{${name}}`
  )
}

export function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/)
  const value = match ? decodeURIComponent(match[1]) : ''
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${LOCALE_MAX_AGE}; SameSite=Lax`
}

export function parseLocaleCookieHeader(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE
  const match = cookieHeader.match(/(?:^|; )\s*locale=([^;]*)/)
  const value = match ? decodeURIComponent(match[1]) : ''
  return isLocale(value) ? value : DEFAULT_LOCALE
}
