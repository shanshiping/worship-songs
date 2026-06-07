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

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const fileType = file.type

    let title = ''
    let lyrics = ''
    let artist = ''

    // 从文件名提取歌名
    // 移除扩展名和常见前缀
    title = fileName
      .replace(/\.[^/.]+$/, '') // 移除扩展名
      .replace(/^[\d\-_\.]+\s*/, '') // 移除开头的数字和分隔符
      .replace(/[-_]/g, ' ') // 将 - 和 _ 替换为空格
      .trim()

    // 根据文件类型解析内容
    if (fileType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        const text = pdfData.text

        // 尝试从 PDF 内容中提取歌词
        const lines = text.split('\n').filter((line: string) => line.trim())

        // 尝试识别歌词部分（通常在标题之后，有明显的段落结构）
        let lyricsLines: string[] = []
        let foundLyrics = false

        for (const line of lines) {
          const trimmedLine = line.trim()

          // 跳过页码、版权信息等
          if (/^\d+$/.test(trimmedLine)) continue
          if (/版权|©|Copyright/i.test(trimmedLine)) continue
          if (/作词|作曲|编曲/i.test(trimmedLine)) {
            // 提取作者信息
            const artistMatch = trimmedLine.match(/(?:作词|作曲|编曲)[：:]\s*(.+)/)
            if (artistMatch) {
              artist = artistMatch[1].trim()
            }
            continue
          }

          // 如果行包含中文字符且长度适中，可能是歌词
          if (/[一-龥]/.test(trimmedLine) && trimmedLine.length > 2 && trimmedLine.length < 100) {
            foundLyrics = true
            lyricsLines.push(trimmedLine)
          }
        }

        if (lyricsLines.length > 0) {
          lyrics = lyricsLines.join('\n')
        }

        // 如果没有找到歌词，使用整个文本
        if (!lyrics && text.length > 0) {
          // 限制长度
          lyrics = text.substring(0, 2000)
        }
      } catch (error) {
        console.error('PDF parse error:', error)
      }
    } else if (fileType?.startsWith('audio/')) {
      try {
        const musicMetadata = require('music-metadata')
        const metadata = await musicMetadata.parseBuffer(buffer)

        // 从音频元数据中提取信息
        if (metadata.common.title) {
          title = metadata.common.title
        }
        if (metadata.common.artist) {
          artist = metadata.common.artist
        }
        if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
          lyrics = metadata.common.lyrics.join('\n')
        }
      } catch (error) {
        console.error('Audio metadata parse error:', error)
      }
    } else if (fileType?.startsWith('image/')) {
      // 图片文件，尝试从文件名提取信息
      // OCR 需要额外的库，这里只做简单的文件名解析
      const nameParts = title.split(/[\s\-_]+/)
      if (nameParts.length > 1) {
        // 如果文件名包含多个部分，可能包含歌手名
        title = nameParts[0]
        artist = nameParts.slice(1).join(' ')
      }
    }

    // 清理标题
    title = title
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')

    // 如果标题太长，截取前50个字符
    if (title.length > 50) {
      title = title.substring(0, 50)
    }

    return NextResponse.json({
      title,
      lyrics,
      artist,
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
