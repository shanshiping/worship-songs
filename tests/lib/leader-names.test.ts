import { describe, expect, it } from 'vitest'
import {
  dedupeLeaderNames,
  leaderMatchesFilter,
  leaderNameVariants,
  normalizeLeaderName,
} from '@/lib/leader-names'

describe('leader-names', () => {
  it('normalizes known aliases to canonical names', () => {
    expect(normalizeLeaderName('黎明')).toBe('黎明')
    expect(normalizeLeaderName('徐黎明')).toBe('黎明')
    expect(normalizeLeaderName('海平')).toBe('王海平')
    expect(normalizeLeaderName('王海平')).toBe('王海平')
    expect(normalizeLeaderName('壮壮')).toBe('壮壮')
    expect(normalizeLeaderName('张壮康')).toBe('壮壮')
  })

  it('returns variants for canonical and alias names', () => {
    expect(leaderNameVariants('黎明').sort()).toEqual(['黎明', '徐黎明'].sort())
    expect(leaderNameVariants('徐黎明').sort()).toEqual(['黎明', '徐黎明'].sort())
    expect(leaderNameVariants('王海平').sort()).toEqual(['王海平', '海平'].sort())
    expect(leaderNameVariants('壮壮').sort()).toEqual(['壮壮', '张壮康'].sort())
  })

  it('dedupes leader lists by canonical name', () => {
    expect(dedupeLeaderNames(['黎明', '徐黎明', 'Bob', '海平', '王海平'])).toEqual([
      '黎明',
      '王海平',
      'Bob',
    ])
  })

  it('matches aliases against canonical filter names', () => {
    expect(leaderMatchesFilter('黎明', '徐黎明')).toBe(true)
    expect(leaderMatchesFilter('徐黎明', '黎明')).toBe(true)
    expect(leaderMatchesFilter('海平', '王海平')).toBe(true)
    expect(leaderMatchesFilter('Alice', 'Bob')).toBe(false)
  })

  it('excludes invalid leader names from normalization', () => {
    expect(normalizeLeaderName('向神欢呼')).toBeNull()
    expect(dedupeLeaderNames(['黎明', '向神欢呼'])).toEqual(['黎明'])
  })
})
