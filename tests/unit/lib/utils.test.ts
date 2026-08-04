import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toContain('px-2')
    expect(cn('px-2', 'py-1')).toContain('py-1')
  })

  it('resolves tailwind conflicts with last win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
