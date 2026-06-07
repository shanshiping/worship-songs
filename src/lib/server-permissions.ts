import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { hasPermission, type Permission } from './permissions'

// 获取当前会话用户
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return null
  }
  return session.user
}

// 检查当前用户是否有权限
export async function checkPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return hasPermission(user.role, permission)
}

// 权限检查中间件（用于 API 路由）
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('请先登录')
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error('权限不足')
  }
  return user
}
