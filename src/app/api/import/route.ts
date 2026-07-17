import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as XLSX from 'xlsx'

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
  /聚会$/,  // 以"聚会"结尾
  /崇拜$/,  // 以"崇拜"结尾
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

  return true
}

// 清理歌曲名称
function cleanSongName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[\d\.\、\-\s]+/, '')
    .replace(/[\n\r]+/g, ' ')
    .trim()
}

// 解析诗歌名称
function parseSongNames(songStr: string): string[] {
  if (!songStr || songStr.trim() === '' || songStr === '无聚会') {
    return []
  }

  // 处理各种分隔符
  let songs = songStr.split(/[+\n\/、]/).map(s => s.trim())

  // 清理和过滤
  return songs
    .map(s => cleanSongName(s))
    .filter(s => isValidSongName(s))
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

    // 获取默认分类
    let defaultCategory = await prisma.category.findUnique({
      where: { name: '其他' },
    })

    // 如果不存在则创建
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: '其他' },
      })
    }

    // 遍历每个 Sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      let data: any[][]

      try {
        data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
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
          } catch (error: any) {
            results.errors.push(`第 ${i + 1} 行: 创建聚会记录失败 - ${error.message}`)
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
                    categoryId: defaultCategory.id,
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
            } catch (error: any) {
              results.errors.push(`第 ${i + 1} 行, 歌曲 "${songTitle}": ${error.message}`)
            }
          }
        } catch (error: any) {
          results.errors.push(`第 ${i + 1} 行: ${error.message}`)
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
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || '导入失败，请检查文件格式' },
      { status: 500 }
    )
  }
}
