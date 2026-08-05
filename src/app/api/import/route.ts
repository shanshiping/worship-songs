import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseSongNames } from '@/lib/excel-song-names'
import * as XLSX from 'xlsx'

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

    // 验证文件类型
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ]
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!validTypes.includes(file.type) && fileExt !== 'xls' && fileExt !== 'xlsx') {
      return NextResponse.json(
        { error: '请上传 Excel 文件（.xls 或 .xlsx）' },
        { status: 400 }
      )
    }

    // 读取 Excel 文件
    let workbook: XLSX.WorkBook
    try {
      const buffer = await file.arrayBuffer()
      workbook = XLSX.read(buffer, { type: 'array' })
    } catch (error) {
      console.error('Excel parse error:', error)
      return NextResponse.json(
        { error: '文件解析失败，请确保是有效的 Excel 文件' },
        { status: 400 }
      )
    }

    const results = {
      songs: 0,
      meetings: 0,
      errors: [] as string[],
      skipped: 0,
    }

    // 遍历每个 Sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      let data: unknown[][]

      try {
        data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      } catch (error) {
        results.errors.push(`Sheet "${sheetName}" 解析失败`)
        continue
      }

      if (data.length < 2) continue

      // 查找表头行（可能在第 0 行或第 1 行）
      let headerRowIndex = -1
      let dateIndex = -1
      let themeIndex = -1
      let speakerIndex = -1
      let leaderIndex = -1
      let songStartIndex = -1

      for (let i = 0; i < Math.min(3, data.length); i++) {
        const row = data[i]
        if (!row) continue

        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim()
          if (cell.includes('时间') || cell.includes('日期')) {
            headerRowIndex = i
            dateIndex = j
          }
          if (cell.includes('主题')) {
            themeIndex = j
          }
          if (cell.includes('讲员') || cell.includes('讲师')) {
            speakerIndex = j
          }
          if (cell.includes('主领')) {
            leaderIndex = j
          }
          // 优先匹配 "诗歌" 列，而不是 "圣餐诗歌" 列
          if (cell === '诗歌' || cell === '诗歌1' || cell === '诗歌（一）') {
            songStartIndex = j
          }
        }
      }

      if (headerRowIndex === -1 || dateIndex === -1 || songStartIndex === -1) {
        results.errors.push(`Sheet "${sheetName}": 无法识别表头格式`)
        continue
      }

      // 解析数据行
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[dateIndex]) {
          results.skipped++
          continue
        }

        try {
          // 解析日期
          let dateValue = row[dateIndex]
          let date: Date

          if (typeof dateValue === 'number') {
            // Excel 日期序列号转换
            date = new Date((dateValue - 25569) * 86400 * 1000)
          } else if (typeof dateValue === 'string') {
            date = new Date(dateValue)
          } else {
            results.skipped++
            continue
          }

          if (isNaN(date.getTime())) {
            results.skipped++
            continue
          }

          // 解析主题、讲员、主领
          const theme = themeIndex >= 0 ? String(row[themeIndex] || '').trim() : null
          const speaker = speakerIndex >= 0 ? String(row[speakerIndex] || '').trim() : null
          const leader = leaderIndex >= 0 ? String(row[leaderIndex] || '').trim() : null

          // 解析诗歌（同行可能多列重复同一首歌，按出现顺序去重）
          const seenTitles = new Set<string>()
          const songNames: string[] = []
          for (let j = songStartIndex; j < row.length; j++) {
            const cellValue = String(row[j] || '').trim()
            if (cellValue && cellValue !== '') {
              for (const title of parseSongNames(cellValue)) {
                if (!seenTitles.has(title)) {
                  seenTitles.add(title)
                  songNames.push(title)
                }
              }
            }
          }

          if (songNames.length === 0) {
            results.skipped++
            continue
          }

          // 创建聚会记录
          let meeting
          try {
            meeting = await prisma.meeting.create({
              data: {
                date,
                theme: theme && theme !== '' ? theme : null,
                speaker: speaker && speaker !== '' && speaker !== '？' ? speaker : null,
                leader: leader && leader !== '' && leader !== '？' ? leader : null,
                type: 'MORNING',
              },
            })
            results.meetings++
          } catch (error: unknown) {
            results.errors.push(`第 ${i + 1} 行: 创建聚会记录失败 - ${getErrorMessage(error, '未知错误')}`)
            continue
          }

          // 创建或关联歌曲
          for (let k = 0; k < songNames.length; k++) {
            const songTitle = songNames[k]
            if (!songTitle) continue

            try {
              // 查找或创建歌曲
              let song = await prisma.song.findFirst({
                where: { title: songTitle },
              })

              if (!song) {
                song = await prisma.song.create({
                  data: {
                    title: songTitle,
                  },
                })
                results.songs++
              }

              // 创建关联（upsert 避免 meetingId+songId 唯一约束冲突）
              await prisma.meetingSong.upsert({
                where: {
                  meetingId_songId: {
                    meetingId: meeting.id,
                    songId: song.id,
                  },
                },
                create: {
                  meetingId: meeting.id,
                  songId: song.id,
                  order: k + 1,
                },
                update: {
                  order: k + 1,
                },
              })
            } catch (error: unknown) {
              results.errors.push(`第 ${i + 1} 行, 歌曲 "${songTitle}": ${getErrorMessage(error, '未知错误')}`)
            }
          }
        } catch (error: unknown) {
          results.errors.push(`第 ${i + 1} 行: ${getErrorMessage(error, '未知错误')}`)
        }
      }
    }

    return NextResponse.json({
      message: '导入完成',
      results: {
        songs: results.songs,
        meetings: results.meetings,
        errors: results.errors.slice(0, 50), // 限制错误数量
        skipped: results.skipped,
      },
    })
  } catch (error: unknown) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, '导入失败，请检查文件格式') },
      { status: 500 }
    )
  }
}
