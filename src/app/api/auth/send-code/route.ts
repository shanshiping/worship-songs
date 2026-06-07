import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 存储验证码（实际应该用 Redis）
const codeStore = new Map<string, { code: string; expires: number }>()

// 生成验证码
function generateCode(): string {
  return Math.random().toString().slice(2, 8).padStart(6, '0')
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length < 11) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      )
    }

    // 检查手机号是否已注册
    const user = await prisma.user.findFirst({
      where: { phone },
    })

    if (!user) {
      return NextResponse.json(
        { error: '该手机号未注册' },
        { status: 400 }
      )
    }

    // 检查是否频繁发送
    const existing = codeStore.get(phone)
    if (existing && existing.expires > Date.now()) {
      const remaining = Math.ceil((existing.expires - Date.now()) / 1000)
      return NextResponse.json(
        { error: `请等待 ${remaining} 秒后再试` },
        { status: 429 }
      )
    }

    // 生成验证码
    const code = generateCode()

    // 存储验证码（5分钟有效）
    codeStore.set(phone, {
      code,
      expires: Date.now() + 5 * 60 * 1000,
    })

    // TODO: 调用短信服务发送验证码
    // 这里只是模拟，实际需要集成短信服务（如阿里云短信、腾讯云短信等）
    console.log(`验证码已发送到 ${phone}: ${code}`)

    // 开发环境下返回验证码（生产环境应该删除）
    return NextResponse.json({
      message: '验证码已发送',
      // 注意：生产环境不要返回验证码
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

// 导出 codeStore 供其他 API 使用
export { codeStore }
