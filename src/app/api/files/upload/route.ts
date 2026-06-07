import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'sheet' or 'audio'

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = {
      sheet: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'],
    }

    const validTypes = allowedTypes[type as keyof typeof allowedTypes] || allowedTypes.sheet
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件格式' },
        { status: 400 }
      )
    }

    // 验证文件大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: '文件大小不能超过 50MB' },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${ext}`
    const uploadDir = type === 'audio' ? 'public/uploads/audio' : 'public/uploads/sheets'

    // 确保目录存在
    await mkdir(join(process.cwd(), uploadDir), { recursive: true })

    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(process.cwd(), uploadDir, fileName), buffer)

    // 返回文件路径
    const filePath = `/uploads/${type === 'audio' ? 'audio' : 'sheets'}/${fileName}`

    return NextResponse.json({
      path: filePath,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    )
  }
}
