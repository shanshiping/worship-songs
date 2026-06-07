// 角色定义
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN', // 超级管理员 - 所有权限
  ADMIN: 'ADMIN',             // 管理员 - 编辑、上传、下载、删除
  LEADER: 'LEADER',           // 领队 - 编辑、上传、下载
  MEMBER: 'MEMBER',           // 普通成员 - 只能下载
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// 权限定义
export const PERMISSIONS = {
  // 歌曲权限
  SONG_CREATE: 'song:create',
  SONG_EDIT: 'song:edit',
  SONG_DELETE: 'song:delete',
  SONG_DOWNLOAD: 'song:download',
  SONG_UPLOAD: 'song:upload',

  // 聚会权限
  MEETING_CREATE: 'meeting:create',
  MEETING_EDIT: 'meeting:edit',
  MEETING_DELETE: 'meeting:delete',
  MEETING_DOWNLOAD: 'meeting:download',

  // 分类权限
  CATEGORY_CREATE: 'category:create',
  CATEGORY_EDIT: 'category:edit',
  CATEGORY_DELETE: 'category:delete',

  // 用户管理权限
  USER_MANAGE: 'user:manage',

  // 数据导入导出权限
  DATA_IMPORT: 'data:import',
  DATA_EXPORT: 'data:export',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// 角色权限映射
const rolePermissions: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // 超级管理员拥有所有权限
  [ROLES.ADMIN]: [
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DELETE,
    PERMISSIONS.SONG_DOWNLOAD,
    PERMISSIONS.SONG_UPLOAD,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_EDIT,
    PERMISSIONS.MEETING_DELETE,
    PERMISSIONS.MEETING_DOWNLOAD,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_EDIT,
    PERMISSIONS.CATEGORY_DELETE,
    PERMISSIONS.DATA_IMPORT,
    PERMISSIONS.DATA_EXPORT,
  ],
  [ROLES.LEADER]: [
    PERMISSIONS.SONG_CREATE,
    PERMISSIONS.SONG_EDIT,
    PERMISSIONS.SONG_DOWNLOAD,
    PERMISSIONS.SONG_UPLOAD,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_EDIT,
    PERMISSIONS.MEETING_DOWNLOAD,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_EDIT,
    PERMISSIONS.DATA_IMPORT,
    PERMISSIONS.DATA_EXPORT,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.SONG_DOWNLOAD,
    PERMISSIONS.MEETING_DOWNLOAD,
    PERMISSIONS.DATA_EXPORT,
  ],
}

// 检查角色是否有某个权限
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role as Role]
  if (!permissions) return false
  return permissions.includes(permission)
}

// 检查是否是超级管理员
export function isSuperAdmin(role: string): boolean {
  return role === ROLES.SUPER_ADMIN
}

// 检查是否是管理员或以上
export function isAdminOrAbove(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN
}

// 检查是否是领队或以上
export function isLeaderOrAbove(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.LEADER
}

// 获取角色显示名称
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    SUPER_ADMIN: '超级管理员',
    ADMIN: '管理员',
    LEADER: '领队',
    MEMBER: '成员',
  }
  return roleNames[role] || '未知角色'
}

// 获取角色颜色
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500',
    ADMIN: 'bg-orange-500',
    LEADER: 'bg-blue-500',
    MEMBER: 'bg-gray-500',
  }
  return roleColors[role] || 'bg-gray-500'
}
