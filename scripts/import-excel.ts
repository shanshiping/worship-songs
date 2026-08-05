import { PrismaClient } from '@prisma/client'

import XLSX from 'xlsx'
import { isValidSongName, parseSongNames } from '../src/lib/excel-song-names'

const prisma = new PrismaClient()

// Excel 日期序列号转 JavaScript 日期
function excelDateToJSDate(excelDate: number): Date {
  return new Date((excelDate - 25569) * 86400 * 1000)
}

// 聚会数据接口
interface MeetingData {
  date: Date
  theme: string | null
  speaker: string | null
  leader: string | null
  type: string
  songs: Set<string>
}

async function main() {
  console.log('开始导入 Excel 数据...\n')

  const workbook = XLSX.readFile('/Users/ping/Desktop/敬拜赞美诗歌表(1)_副本.xls')

  const meetingsMap = new Map<string, MeetingData>()
  const skippedItems: string[] = []

  for (const sheetName of workbook.SheetNames) {
    console.log(`\n处理 Sheet: ${sheetName}`)

    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    if (data.length < 3) {
      console.log('  跳过：数据不足')
      continue
    }

    let headerRowIndex = -1
    let dateColIndex = -1
    let themeColIndex = -1
    let speakerColIndex = -1
    let leaderColIndex = -1
    let songStartIndex = -1

    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i] as string[]
      if (!row) continue

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim()
        if (cell.includes('时间') || cell.includes('日期')) {
          headerRowIndex = i
          dateColIndex = j
        }
        if (cell.includes('主题')) {
          themeColIndex = j
        }
        if (cell.includes('讲员') || cell.includes('讲师')) {
          speakerColIndex = j
        }
        if (cell.includes('主领')) {
          leaderColIndex = j
        }
        if (cell === '诗歌' || cell === '诗歌1' || cell === '诗歌（一）') {
          songStartIndex = j
        }
      }
    }

    if (headerRowIndex === -1 || dateColIndex === -1 || songStartIndex === -1) {
      console.log('  跳过：无法识别表头')
      continue
    }

    console.log(`  表头行: ${headerRowIndex}, 日期列: ${dateColIndex}, 诗歌起始列: ${songStartIndex}`)

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i] as any[]
      if (!row || !row[dateColIndex]) continue

      try {
        let dateValue = row[dateColIndex]
        let date: Date

        if (typeof dateValue === 'number') {
          date = excelDateToJSDate(dateValue)
        } else if (typeof dateValue === 'string') {
          date = new Date(dateValue)
        } else {
          continue
        }

        if (isNaN(date.getTime())) {
          continue
        }

        const theme = themeColIndex >= 0 ? String(row[themeColIndex] || '').trim() : null
        const speaker = speakerColIndex >= 0 ? String(row[speakerColIndex] || '').trim() : null
        const leader = leaderColIndex >= 0 ? String(row[leaderColIndex] || '').trim() : null

        const dateStr = date.toISOString().split('T')[0]
        const themeKey = theme ? theme.replace(/[\n\r]+/g, ' ').trim() : 'default'
        const meetingKey = `${dateStr}_${themeKey}`

        let meetingData = meetingsMap.get(meetingKey)
        if (!meetingData) {
          meetingData = {
            date,
            theme: theme && theme !== '' ? theme : null,
            speaker: speaker && speaker !== '' && speaker !== '？' ? speaker : null,
            leader: leader && leader !== '' && leader !== '？' ? leader : null,
            type: 'MORNING',
            songs: new Set(),
          }
          meetingsMap.set(meetingKey, meetingData)
        } else {
          if (speaker && speaker !== '' && speaker !== '？') {
            meetingData.speaker = speaker
          }
          if (leader && leader !== '' && leader !== '？') {
            meetingData.leader = leader
          }
        }

        for (let j = songStartIndex; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim()
          if (cellValue && cellValue !== '' && cellValue !== '无聚会') {
            const songs = parseSongNames(cellValue)
            songs.forEach(song => meetingData!.songs.add(song))

            const rawSongs = cellValue.split(/[+\n\/、；]/).map(s => s.trim())
            for (const raw of rawSongs) {
              if (raw && !isValidSongName(raw)) {
                skippedItems.push(`行${i + 1}: "${raw}"`)
              }
            }
          }
        }

        console.log(`  ${dateStr}: ${meetingData.songs.size} 首诗歌`)
      } catch (error) {
        console.error(`  行 ${i + 1} 解析失败:`, error)
      }
    }
  }

  console.log(`\n共找到 ${meetingsMap.size} 个聚会记录`)

  let totalMeetings = 0
  let totalSongs = 0
  const allSongTitles = new Set<string>()

  for (const [key, meetingData] of meetingsMap) {
    if (meetingData.songs.size === 0) continue

    const meeting = await prisma.meeting.create({
      data: {
        date: meetingData.date,
        theme: meetingData.theme,
        speaker: meetingData.speaker,
        leader: meetingData.leader,
        type: meetingData.type,
      },
    })

    totalMeetings++

    let order = 1
    for (const songTitle of meetingData.songs) {
      if (!songTitle) continue

      allSongTitles.add(songTitle)

      let song = await prisma.song.findFirst({
        where: { title: songTitle },
      })

      if (!song) {
        song = await prisma.song.create({
          data: {
            title: songTitle,
          },
        })
        totalSongs++
      }

      await prisma.meetingSong.create({
        data: {
          meetingId: meeting.id,
          songId: song.id,
          order: order++,
        },
      })
    }
  }

  console.log('\n=== 导入完成 ===')
  console.log(`导入聚会记录: ${totalMeetings} 条`)
  console.log(`新增歌曲: ${totalSongs} 首`)
  console.log(`歌曲总数: ${allSongTitles.size} 首`)

  if (skippedItems.length > 0) {
    console.log(`\n被过滤的非歌曲内容: ${skippedItems.length} 项`)
    console.log('示例:')
    const uniqueSkipped = [...new Set(skippedItems)].slice(0, 20)
    uniqueSkipped.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`)
    })
  }

  console.log('\n部分歌曲示例:')
  const songArray = Array.from(allSongTitles).slice(0, 20)
  songArray.forEach((song, index) => {
    console.log(`  ${index + 1}. ${song}`)
  })
  if (allSongTitles.size > 20) {
    console.log(`  ... 还有 ${allSongTitles.size - 20} 首`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
