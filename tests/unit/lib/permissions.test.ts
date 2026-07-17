import { describe, expect, it } from 'vitest'
import {
  hasPermission,
  isAdminOrAbove,
  isLeaderOrAbove,
  isSuperAdmin,
  PERMISSIONS,
  ROLES,
} from '@/lib/permissions'

describe('permissions', () => {
  it('grants SUPER_ADMIN every permission', () => {
    expect(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.USER_MANAGE)).toBe(true)
    expect(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SONG_DELETE)).toBe(true)
  })

  it('denies MEMBER song create', () => {
    expect(hasPermission(ROLES.MEMBER, PERMISSIONS.SONG_CREATE)).toBe(false)
  })

  it('allows MEMBER download', () => {
    expect(hasPermission(ROLES.MEMBER, PERMISSIONS.SONG_DOWNLOAD)).toBe(true)
  })

  it('returns false for unknown roles', () => {
    expect(hasPermission('UNKNOWN', PERMISSIONS.SONG_DOWNLOAD)).toBe(false)
  })

  it('checks role hierarchy helpers', () => {
    expect(isSuperAdmin(ROLES.SUPER_ADMIN)).toBe(true)
    expect(isAdminOrAbove(ROLES.ADMIN)).toBe(true)
    expect(isAdminOrAbove(ROLES.LEADER)).toBe(false)
    expect(isLeaderOrAbove(ROLES.LEADER)).toBe(true)
    expect(isLeaderOrAbove(ROLES.MEMBER)).toBe(false)
  })
})
