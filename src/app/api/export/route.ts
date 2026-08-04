import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    const where: Prisma.MeetingWhereInput = {}

    if (year) {
      const startDate = new Date(`${year}-01-01`)
      const endDate = new Date(`${year}-12-31`)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    // 获取聚会记录
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        songs: {
          include: {
            song: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    // 创建工作簿
    const wb = XLSX.utils.book_new()

    // 按年份分组
    const meetingsByYear: Record<number, typeof meetings> = {}
    meetings.forEach((meeting) => {
      const meetingYear = new Date(meeting.date).getFullYear()
      if (!meetingsByYear[meetingYear]) {
        meetingsByYear[meetingYear] = []
      }
      meetingsByYear[meetingYear].push(meeting)
    })

    // 为每年创建一个 Sheet
    for (const [sheetYear, yearMeetings] of Object.entries(meetingsByYear)) {
      // 准备数据
      const data = yearMeetings.map((meeting) => {
        const songs = meeting.songs.map((ms) => ms.song.title)
        return {
          '时间': new Date(meeting.date).toLocaleDateString('zh-CN'),
          '主题信息': meeting.theme || '',
          '讲员': meeting.speaker || '',
          '主领': meeting.leader || '',
          '诗歌1': songs[0] || '',
          '诗歌2': songs[1] || '',
          '诗歌3': songs[2] || '',
          '诗歌4': songs[3] || '',
          '诗歌5': songs[4] || '',
          '备注': meeting.notes || '',
        }
      })

      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(data)

      // 设置列宽
      ws['!cols'] = [
        { wch: 12 }, // 时间
        { wch: 30 }, // 主题信息
        { wch: 10 }, // 讲员
        { wch: 10 }, // 主领
        { wch: 20 }, // 诗歌1
        { wch: 20 }, // 诗歌2
        { wch: 20 }, // 诗歌3
        { wch: 20 }, // 诗歌4
        { wch: 20 }, // 诗歌5
        { wch: 20 }, // 备注
      ]

      // 添加到工作簿
      XLSX.utils.book_append_sheet(wb, ws, sheetYear)
    }

    // 生成 Excel 文件
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=worship-songs-${year || 'all'}.xlsx`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    )
  }
}
