import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import {
  emailVerificationKey,
  verifyAndConsumeCode,
} from '@/lib/verification-codes'

export async function POST(request: Request) {
  try {
    const { name, email, password, code } = await request.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!name || !normalizedEmail || !password || !code) {
      return NextResponse.json(
        { error: '请填写所有必填字段并输入验证码' },
        { status: 400 }
      )
    }

    const verified = verifyAndConsumeCode(emailVerificationKey(normalizedEmail), code)
    if (!verified) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'MEMBER',
        emailVerified: new Date(),
      },
    })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}
