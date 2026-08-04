import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/send-email'
import {
  emailVerificationKey,
  generateVerificationCode,
  getActiveCodeRemainingSeconds,
  setVerificationCode,
} from '@/lib/verification-codes'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
    }

    const key = emailVerificationKey(normalizedEmail)
    const remaining = getActiveCodeRemainingSeconds(key)
    if (remaining > 240) {
      return NextResponse.json(
        { error: `请等待 ${remaining} 秒后再试` },
        { status: 429 }
      )
    }

    const code = generateVerificationCode()
    setVerificationCode(key, code)
    await sendVerificationEmail(normalizedEmail, code)

    return NextResponse.json({
      message: '验证码已发送',
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    })
  } catch (error) {
    console.error('Send email code error:', error)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}
