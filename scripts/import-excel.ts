import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import XLSX from 'xlsx'

// Prisma v7 requires an adapter for SQLite
const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
})

const prisma = new PrismaClient({
  adapter,
})

// Excel 日期序列号转 JavaScript 日期
function excelDateToJSDate(excelDate: number): Date {
  return new Date((excelDate - 25569) * 86400 * 1000)
}

// 排除的非歌曲关键词
const excludeKeywords = [
  // 场次和时间
  '上午', '下午', '晚间', '上午场', '下午场', '晚间场',
  '上午聚会', '下午聚会', '晚间聚会',

  // 聚会类型
  '无聚会', '暂停', '取消', '联合崇拜', '特别聚会',
  '圣餐', '洗礼', '祷告会', '查经', '团契',
  '主日学', '儿童崇拜', '青年崇拜',
  '回应诗歌', '回应', '散会诗歌', '散会',
  '布道会', '培灵会', '退修会', '感恩节',
  '受难节', '复活节', '圣诞节',

  // 经文相关
  '经文', '圣经', '旧约', '新约',
  '创世记', '出埃及记', '利未记', '民数记', '申命记',
  '约书亚记', '士师记', '路得记', '撒母耳记', '列王记',
  '历代志', '以斯拉记', '尼希米记', '以斯帖记',
  '约伯记', '诗篇', '箴言', '传道书', '雅歌',
  '以赛亚书', '耶利米书', '耶利米哀歌', '以西结书', '但以理书',
  '何西阿书', '约珥书', '阿摩司书', '俄巴底亚书', '约拿书',
  '弥迦书', '那鸿书', '哈巴谷书', '西番雅书', '哈该书',
  '撒迦利亚书', '玛拉基书',
  '马太福音', '马可福音', '路加福音', '约翰福音',
  '使徒行传', '罗马书', '哥林多前书', '哥林多后书',
  '加拉太书', '以弗所书', '腓立比书', '歌罗西书',
  '帖撒罗尼迦前书', '帖撒罗尼迦后书', '提摩太前书', '提摩太后书',
  '提多书', '腓利门书', '希伯来书', '雅各书',
  '彼得前书', '彼得后书', '约翰一书', '约翰二书', '约翰三书',
  '犹大书', '启示录',

  // 主题相关
  '主题', '讲章', '证道', '分享', '信息',

  // 人名（常见）
  '弟兄', '姊妹', '牧师', '传道', '长老', '执事',
  '张锐', '林婵', '杜鹃', '单丹', '壮壮', '世平',
  '美珍', '黎明', '文书', '陈彬', 'Jimmy', 'Edward',
  '海燕', '海平', '晓璇', '晓岚', '刘冰', '冰冰',
  '单世平', '陈俊', '姜宁宁', '宁宁', '杨欢',
  '萄萄', '汪湛', '刘牧师', '李院长', '周CD',
  '汪弟兄', '黄弟兄', '张弟兄', '刘弟兄', '李弟兄',
  '周弟兄', '陈弟兄', '王弟兄', '赵弟兄',
  '鞠菟', '文雅', '黄文雅', '刘德义', '俞牧师',
  '赵牧师', '胡牧师', '李元苍', '朱永良',
  '詹弟兄', '林清福', '简相腾', '周佳福',
  '何老师', '赖MS', '徐MS', '钟JM', '孙DX',
  '张海英', '钟晓雯', '周慧', '刘增强',
  '刘MS', '汪湛DX', '周慧CD', '李冬CD',
  '李冬传道', '刘志刚', '陈宏碁',
]

// 排除的正则表达式
const excludePatterns = [
  /^\d+$/,  // 纯数字
  /^[A-Za-z]$/,  // 单个字母
  /^[一二三四五六七八九十百千万亿]+$/,  // 纯中文数字
  /^第[一二三四五六七八九十百千万亿]+[首歌曲章篇]$/,  // "第X首/歌/章/篇"
  /^[（(].*[)）]$/,  // 括号内容
  /^经文[:：]/,  // 经文开头
  /^备注[:：]/,  // 备注开头
  /^说明[:：]/,  // 说明开头
  /^注[:：]/,  // 注开头
  /^[\d\s\-\/\.]+$/,  // 纯数字、日期格式
  /^[A-Za-z\s]+$/,  // 纯英文
  /^[A-Za-z]{2,}弟兄$/,  // 英文名+弟兄
  /^[一-龥]{1,3}弟兄$/,  // 中文名+弟兄
  /^[一-龥]{1,3}姊妹$/,  // 中文名+姊妹
  /^[一-龥]{1,3}牧师$/,  // 中文名+牧师
  /^[一-龥]{1,3}传道$/,  // 中文名+传道
  /章$/,  // 以"章"结尾（经文章节）
  /节$/,  // 以"节"结尾（经文章节）
  /篇$/,  // 以"篇"结尾（诗篇）
  /^出\d+/,  // 出埃及记章节
  /^创\d+/,  // 创世记章节
  /^太\d+/,  // 马太福音章节
  /^可\d+/,  // 马可福音章节
  /^路\d+/,  // 路加福音章节
  /^约\d+/,  // 约翰福音章节
  /^徒\d+/,  // 使徒行传章节
  /^罗\d+/,  // 罗马书章节
  /^林前\d+/,  // 哥林多前书章节
  /^林后\d+/,  // 哥林多后书章节
  /^加\d+/,  // 加拉太书章节
  /^弗\d+/,  // 以弗所书章节
  /^腓\d+/,  // 腓立比书章节
  /^西\d+/,  // 歌罗西书章节
  /^帖前\d+/,  // 帖撒罗尼迦前书章节
  /^帖后\d+/,  // 帖撒罗尼迦后书章节
  /^提前\d+/,  // 提摩太前书章节
  /^提后\d+/,  // 提摩太后书章节
  /^多\d+/,  // 提多书章节
  /^来\d+/,  // 希伯来书章节
  /^雅\d+/,  // 雅各书章节
  /^彼前\d+/,  // 彼得前书章节
  /^彼后\d+/,  // 彼得后书章节
  /^启\d+/,  // 启示录章节
  /^王上\d+/,  // 列王记上章节
  /^王下\d+/,  // 列王记下章节
  /^代上\d+/,  // 历代志上章节
  /^代下\d+/,  // 历代志下章节
  /^撒上\d+/,  // 撒母耳记上章节
  /^撒下\d+/,  // 撒母耳记下章节
  /^尼\d+/,  // 尼希米记章节
  /^斯\d+/,  // 以斯帖记章节
  /^伯\d+/,  // 约伯记章节
  /^诗\d+/,  // 诗篇章节
  /^箴\d+/,  // 箴言章节
  /^传\d+/,  // 传道书章节
  /^赛\d+/,  // 以赛亚书章节
  /^耶\d+/,  // 耶利米书章节
  /^哀\d+/,  // 耶利米哀歌章节
  /^结\d+/,  // 以西结书章节
  /^但\d+/,  // 但以理书章节
  /^何\d+/,  // 何西阿书章节
  /^珥\d+/,  // 约珥书章节
  /^摩\d+/,  // 阿摩司书章节
  /^俄\d+/,  // 俄巴底亚书章节
  /^拿\d+/,  // 约拿书章节
  /^弥\d+/,  // 弥迦书章节
  /^鸿\d+/,  // 那鸿书章节
  /^哈\d+/,  // 哈巴谷书章节
  /^番\d+/,  // 西番雅书章节
  /^该\d+/,  // 哈该书章节
  /^亚\d+/,  // 撒迦利亚书章节
  /^玛\d+/,  // 玛拉基书章节
  /^约壹\d+/,  // 约翰一书章节
  /^约贰\d+/,  // 约翰二书章节
  /^约叁\d+/,  // 约翰三书章节
  /^犹\d+/,  // 犹大书章节
]

// 判断是否是有效的歌曲名称
function isValidSongName(name: string): boolean {
  if (!name || name.trim() === '') {
    return false
  }

  const trimmedName = name.trim()

  // 长度检查
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return false
  }

  // 检查是否包含排除关键词
  for (const keyword of excludeKeywords) {
    if (trimmedName.includes(keyword)) {
      return false
    }
  }

  // 检查是否匹配排除模式
  for (const pattern of excludePatterns) {
    if (pattern.test(trimmedName)) {
      return false
    }
  }

  // 检查是否以数字开头
  if (/^\d+[\.\、\-\s]/.test(trimmedName)) {
    return false
  }

  // 检查是否包含特殊字符
  if (/[【】\[\]{}]/.test(trimmedName)) {
    return false
  }

  // 检查是否是问号或未知
  if (trimmedName === '？' || trimmedName === '?' || trimmedName === '未知') {
    return false
  }

  // 检查是否包含"聚会"、"崇拜"等词
  if (/聚会|崇拜|培灵|退修|布道/.test(trimmedName)) {
    return false
  }

  return true
}

// 清理歌曲名称
function cleanSongName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\d\.\、\-\s]+/, '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
}

// 解析诗歌名称
function parseSongNames(songStr: string): string[] {
  if (!songStr || songStr.trim() === '' || songStr === '无聚会') {
    return []
  }

  // 处理各种分隔符
  let songs = songStr.split(/[+\n\/、；]/).map(s => s.trim())

  // 清理和过滤
  return songs
    .map(s => cleanSongName(s))
    .filter(s => isValidSongName(s))
}

// 聚会数据接口
interface MeetingData {
  date: Date
  theme: string | null
  speaker: string | null
  leader: string | null
  type: string
  songs: Set<string>  // 使用 Set 去重
}

async function main() {
  console.log('开始导入 Excel 数据...\n')

  const workbook = XLSX.readFile('/Users/ping/Desktop/敬拜赞美诗歌表(1)_副本.xls')

  const defaultCategory = await prisma.category.findUnique({
    where: { name: '其他' },
  })

  if (!defaultCategory) {
    console.error('错误：未找到默认分类"其他"')
    return
  }

  // 使用 Map 按日期+主题合并聚会
  const meetingsMap = new Map<string, MeetingData>()
  const skippedItems: string[] = []

  // 遍历每个 Sheet
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n处理 Sheet: ${sheetName}`)

    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    if (data.length < 3) {
      console.log('  跳过：数据不足')
      continue
    }

    // 找到表头行
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
        // 优先匹配 "诗歌" 列，而不是 "圣餐诗歌" 列
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

    // 解析数据行
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i] as any[]
      if (!row || !row[dateColIndex]) continue

      try {
        // 解析日期
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

        // 解析主题、讲员、主领
        const theme = themeColIndex >= 0 ? String(row[themeColIndex] || '').trim() : null
        const speaker = speakerColIndex >= 0 ? String(row[speakerColIndex] || '').trim() : null
        const leader = leaderColIndex >= 0 ? String(row[leaderColIndex] || '').trim() : null

        // 生成聚会唯一键（日期+主题，移除换行符）
        const dateStr = date.toISOString().split('T')[0]
        const themeKey = theme ? theme.replace(/[\n\r]+/g, ' ').trim() : 'default'
        const meetingKey = `${dateStr}_${themeKey}`

        // 获取或创建聚会数据
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
          // 更新讲员和主领（如果新的不为空）
          if (speaker && speaker !== '' && speaker !== '？') {
            meetingData.speaker = speaker
          }
          if (leader && leader !== '' && leader !== '？') {
            meetingData.leader = leader
          }
        }

        // 解析诗歌
        for (let j = songStartIndex; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim()
          if (cellValue && cellValue !== '' && cellValue !== '无聚会') {
            const songs = parseSongNames(cellValue)
            songs.forEach(song => meetingData!.songs.add(song))

            // 记录被过滤的内容
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

  // 创建数据库记录
  let totalMeetings = 0
  let totalSongs = 0
  const allSongTitles = new Set<string>()

  for (const [key, meetingData] of meetingsMap) {
    if (meetingData.songs.size === 0) continue

    // 创建聚会记录
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

    // 创建或关联歌曲
    let order = 1
    for (const songTitle of meetingData.songs) {
      if (!songTitle) continue

      allSongTitles.add(songTitle)

      // 查找或创建歌曲
      let song = await prisma.song.findFirst({
        where: { title: songTitle },
      })

      if (!song) {
        song = await prisma.song.create({
          data: {
            title: songTitle,
            categoryId: defaultCategory.id,
          },
        })
        totalSongs++
      }

      // 创建关联
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

  // 显示被过滤的内容
  if (skippedItems.length > 0) {
    console.log(`\n被过滤的非歌曲内容: ${skippedItems.length} 项`)
    console.log('示例:')
    const uniqueSkipped = [...new Set(skippedItems)].slice(0, 20)
    uniqueSkipped.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`)
    })
  }

  // 显示部分歌曲列表
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
