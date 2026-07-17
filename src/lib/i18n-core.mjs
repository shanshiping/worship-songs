export const DEFAULT_LOCALE = 'en'
export const LOCALE_COOKIE = 'locale'
export const LOCALES = ['en', 'zh']

export function isLocale(value) {
  return value === 'en' || value === 'zh'
}

export function htmlLang(locale) {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

export function getNested(obj, path) {
  const parts = path.split('.')
  let cur = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function translate(catalogs, locale, key, params) {
  const dict = catalogs[locale] || catalogs[DEFAULT_LOCALE] || {}
  let text = getNested(dict, key)
  if (text == null) {
    text = getNested(catalogs[DEFAULT_LOCALE] || {}, key)
  }
  if (text == null) return key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    params[name] != null ? String(params[name]) : `{${name}}`
  )
}
