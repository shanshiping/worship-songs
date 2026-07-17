import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getNested, translate, isLocale, htmlLang, DEFAULT_LOCALE } from './i18n-core.mjs'

describe('isLocale', () => {
  it('accepts en and zh', () => {
    assert.equal(isLocale('en'), true)
    assert.equal(isLocale('zh'), true)
    assert.equal(isLocale('fr'), false)
  })
})

describe('getNested', () => {
  it('resolves dotted paths', () => {
    assert.equal(getNested({ a: { b: 'x' } }, 'a.b'), 'x')
    assert.equal(getNested({ a: { b: 'x' } }, 'a.c'), undefined)
  })
})

describe('translate', () => {
  const messages = {
    en: { greeting: 'Hello {name}', nested: { ok: 'OK' } },
    zh: { greeting: '你好 {name}', nested: { ok: '好的' } },
  }

  it('returns nested key for locale', () => {
    assert.equal(translate(messages, 'en', 'nested.ok'), 'OK')
    assert.equal(translate(messages, 'zh', 'nested.ok'), '好的')
  })

  it('interpolates params', () => {
    assert.equal(translate(messages, 'en', 'greeting', { name: 'Ada' }), 'Hello Ada')
  })

  it('falls back to key when missing', () => {
    assert.equal(translate(messages, 'en', 'missing.key'), 'missing.key')
  })
})

describe('htmlLang', () => {
  it('maps locales', () => {
    assert.equal(htmlLang('en'), 'en')
    assert.equal(htmlLang('zh'), 'zh-CN')
  })
})

describe('DEFAULT_LOCALE', () => {
  it('is en', () => {
    assert.equal(DEFAULT_LOCALE, 'en')
  })
})
