import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

// 验证码存储（与 send-code API 共享）
const codeStore = new Map<string, { code: string; expires: number }>()

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      id: 'credentials',
      name: '邮箱登录',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user) {
          throw new Error('用户不存在')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('密码错误')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),

    // 手机验证码登录
    CredentialsProvider({
      id: 'phone',
      name: '手机登录',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          throw new Error('请输入手机号和验证码')
        }

        // 验证验证码
        const stored = codeStore.get(credentials.phone)
        if (!stored) {
          throw new Error('请先获取验证码')
        }

        if (stored.expires < Date.now()) {
          codeStore.delete(credentials.phone)
          throw new Error('验证码已过期')
        }

        if (stored.code !== credentials.code) {
          throw new Error('验证码错误')
        }

        // 验证通过，删除验证码
        codeStore.delete(credentials.phone)

        // 查找用户
        const user = await prisma.user.findFirst({
          where: {
            phone: credentials.phone,
          },
        })

        if (!user) {
          throw new Error('该手机号未注册')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
  },
}
