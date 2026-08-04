import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

describe('normalizeOptional / isValidHttpUrl', () => {
  let normalizeOptional: (value: unknown) => string | null
  let isValidHttpUrl: (value: string) => boolean

  beforeAll(async () => {
    const mod = await import('@/app/api/songs/route')
    normalizeOptional = mod.normalizeOptional
    isValidHttpUrl = mod.isValidHttpUrl
  })

  it('trims and nulls empty strings', () => {
    expect(normalizeOptional('  hi  ')).toBe('hi')
    expect(normalizeOptional('')).toBeNull()
    expect(normalizeOptional('   ')).toBeNull()
  })

  it('returns null for non-strings', () => {
    expect(normalizeOptional(null)).toBeNull()
    expect(normalizeOptional(123)).toBeNull()
  })

  it('accepts http and https', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true)
    expect(isValidHttpUrl('http://example.com/path')).toBe(true)
  })

  it('rejects invalid urls', () => {
    expect(isValidHttpUrl('not-a-url')).toBe(false)
    expect(isValidHttpUrl('ftp://example.com')).toBe(false)
  })
})
