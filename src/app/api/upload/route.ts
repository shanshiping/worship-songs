import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      )
    }

    const fileName = file.name
    const fileType = file.type

    // 从文件名提取歌名
    let title = fileName
      .replace(/\.[^/.]+$/, '') // 移除扩展名
      .replace(/^[\d\-_\.]+\s*/, '') // 移除开头的数字和分隔符
      .replace(/[-_]/g, ' ') // 将 - 和 _ 替换为空格
      .trim()

    // 如果标题太长，截取前50个字符
    if (title.length > 50) {
      title = title.substring(0, 50)
    }

    return NextResponse.json({
      title,
      lyrics: '',
      artist: '',
      fileName,
      fileType,
    })
  } catch (error) {
    console.error('Upload parse error:', error)
    return NextResponse.json(
      { error: '文件解析失败' },
      { status: 500 }
    )
  }
}
