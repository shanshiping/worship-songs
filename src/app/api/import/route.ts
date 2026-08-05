import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getErrorMessage } from '@/lib/errors'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  aggregateMeetingRows,
  parseMeetingRow,
  upsertMeetingWithSongs,
  type ImportStats,
} from '@/lib/excel-import'
import * as XLSX from 'xlsx'

function detectHeaderColumns(data: unknown[][]) {
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
      if (cell === '诗歌' || cell === '诗歌1' || cell === '诗歌（一）') {
        songStartIndex = j
      }
    }
  }

  return { headerRowIndex, dateIndex, themeIndex, speakerIndex, leaderIndex, songStartIndex }
}

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

    const results: ImportStats = {
      songs: 0,
      meetings: 0,
      meetingsUpdated: 0,
      errors: [],
      skipped: 0,
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      let data: unknown[][]

      try {
        data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      } catch {
        results.errors.push(`Sheet "${sheetName}" 解析失败`)
        continue
      }

      if (data.length < 2) continue

      const columns = detectHeaderColumns(data)
      if (
        columns.headerRowIndex === -1 ||
        columns.dateIndex === -1 ||
        columns.songStartIndex === -1
      ) {
        results.errors.push(`Sheet "${sheetName}": 无法识别表头格式`)
        continue
      }

      const parsedRows = []
      for (let i = columns.headerRowIndex + 1; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[columns.dateIndex]) {
          results.skipped++
          continue
        }

        const parsed = parseMeetingRow(row, i + 1, columns)
        if (!parsed) {
          results.skipped++
          continue
        }
        parsedRows.push(parsed)
      }

      const aggregatedMeetings = aggregateMeetingRows(parsedRows)

      for (const meetingData of aggregatedMeetings) {
        try {
          await upsertMeetingWithSongs(prisma, meetingData, results)
        } catch (error: unknown) {
          results.errors.push(
            `Sheet "${sheetName}": 聚会 ${meetingData.date.toISOString().split('T')[0]} 导入失败 - ${getErrorMessage(error, '未知错误')}`,
          )
        }
      }
    }

    return NextResponse.json({
      message: '导入完成',
      results: {
        songs: results.songs,
        meetings: results.meetings,
        meetingsUpdated: results.meetingsUpdated,
        errors: results.errors.slice(0, 50),
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
