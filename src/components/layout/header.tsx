'use client'

import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'
import { LogOut, Settings, User, Bell, Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

export function Header() {
  const { data: session } = useSession()

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* 移动端 Logo */}
        <div className="md:hidden flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-white font-bold text-sm">敬</span>
          </div>
          <span className="text-lg font-bold gradient-text">敬拜选歌</span>
        </div>

        {/* 搜索栏 */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索歌曲、聚会..."
              className="pl-10 bg-gray-50/50 border-gray-200/50 focus:bg-white input-focus"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 通知按钮 */}
          <button className="relative p-2 rounded-xl hover:bg-gray-100/50 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* 用户菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="relative h-10 w-10 rounded-xl cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-gray-200/50 hover:ring-primary/30 transition-all">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={''} alt={session?.user?.name || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl" align="end">
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={''} alt={session?.user?.name || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold text-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg cursor-pointer">
                <Link href="/settings" className="flex items-center px-4 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>个人资料</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg cursor-pointer">
                <Link href="/settings" className="flex items-center px-4 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mr-3">
                    <Settings className="h-4 w-4 text-purple-600" />
                  </div>
                  <span>设置</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="rounded-lg cursor-pointer px-4 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mr-3">
                  <LogOut className="h-4 w-4 text-red-600" />
                </div>
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
