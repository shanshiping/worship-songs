import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  generateVerificationCode,
  getActiveCodeRemainingSeconds,
  phoneVerificationKey,
  setVerificationCode,
} from '@/lib/verification-codes'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length < 11) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { phone },
    })

    if (!user) {
      return NextResponse.json(
        { error: '该手机号未注册' },
        { status: 400 }
      )
    }

    const key = phoneVerificationKey(phone)
    const remaining = getActiveCodeRemainingSeconds(key)
    if (remaining > 240) {
      return NextResponse.json(
        { error: `请等待 ${remaining} 秒后再试` },
        { status: 429 }
      )
    }

    const code = generateVerificationCode()
    setVerificationCode(key, code)

    console.log(`验证码已发送到 ${phone}: ${code}`)

    return NextResponse.json({
      message: '验证码已发送',
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json(
      { error: '发送验证码失败' },
      { status: 500 }
    )
  }
}
