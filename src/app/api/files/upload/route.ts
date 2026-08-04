import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_TYPES = {
  sheet: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  cover: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  pptBackground: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'],
} as const

type UploadKind = keyof typeof ALLOWED_TYPES

function isUploadKind(value: string): value is UploadKind {
  return value === 'sheet' || value === 'cover' || value === 'pptBackground' || value === 'audio'
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const typeRaw = formData.get('type')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    const type = typeof typeRaw === 'string' && isUploadKind(typeRaw) ? typeRaw : 'sheet'
    const validTypes = ALLOWED_TYPES[type]

    if (!validTypes.includes(file.type as (typeof validTypes)[number])) {
      return NextResponse.json({ error: '不支持的文件格式' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${uuidv4()}.${ext}`
    const folder =
      type === 'audio'
        ? 'audio'
        : type === 'cover'
          ? 'covers'
          : type === 'pptBackground'
            ? 'ppt-backgrounds'
            : 'sheets'
    const uploadDir = `public/uploads/${folder}`

    await mkdir(join(process.cwd(), uploadDir), { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(process.cwd(), uploadDir, fileName), buffer)

    const filePath = `/uploads/${folder}/${fileName}`

    return NextResponse.json({
      path: filePath,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}
