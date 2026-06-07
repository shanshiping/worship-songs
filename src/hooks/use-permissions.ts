'use client'

import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { hasPermission, type Permission, type Role, ROLES } from '@/lib/permissions'

export function usePermissions() {
  const { data: session } = useSession()

  const permissions = useMemo(() => {
    const role = session?.user?.role as Role || ROLES.MEMBER

    return {
      role,
      // 歌曲权限
      canCreateSong: hasPermission(role, 'song:create'),
      canEditSong: hasPermission(role, 'song:edit'),
      canDeleteSong: hasPermission(role, 'song:delete'),
      canDownloadSong: hasPermission(role, 'song:download'),
      canUploadSong: hasPermission(role, 'song:upload'),

      // 聚会权限
      canCreateMeeting: hasPermission(role, 'meeting:create'),
      canEditMeeting: hasPermission(role, 'meeting:edit'),
      canDeleteMeeting: hasPermission(role, 'meeting:delete'),
      canDownloadMeeting: hasPermission(role, 'meeting:download'),

      // 分类权限
      canCreateCategory: hasPermission(role, 'category:create'),
      canEditCategory: hasPermission(role, 'category:edit'),
      canDeleteCategory: hasPermission(role, 'category:delete'),

      // 用户管理权限
      canManageUsers: hasPermission(role, 'user:manage'),

      // 数据导入导出权限
      canImportData: hasPermission(role, 'data:import'),
      canExportData: hasPermission(role, 'data:export'),

      // 角色检查
      isSuperAdmin: role === ROLES.SUPER_ADMIN,
      isAdmin: role === ROLES.ADMIN,
      isLeader: role === ROLES.LEADER,
      isMember: role === ROLES.MEMBER,
      isAdminOrAbove: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN,
      isLeaderOrAbove: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.LEADER,
    }
  }, [session?.user?.role])

  return permissions
}
