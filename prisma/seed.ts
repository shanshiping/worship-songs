import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

const TYPE_TAGS = [
  '宣教诗歌',
  '主日敬拜',
  '福音布道',
  '圣诞诗歌',
  '复活节诗歌',
  '儿童诗歌',
  '信心回应',
  '敬拜赞美',
  '认罪悔改',
  '迦南诗歌',
  '传统诗歌',
  '英文诗歌',
] as const

const STYLE_TAGS = ['活泼', '忧伤', '激励'] as const

async function main() {
  console.log('开始初始化数据...\n')

  const typeTags = await Promise.all(
    TYPE_TAGS.map((name) =>
      prisma.tag.upsert({
        where: { name_kind: { name, kind: 'TYPE' } },
        update: {},
        create: { name, kind: 'TYPE' },
      })
    )
  )

  const styleTags = await Promise.all(
    STYLE_TAGS.map((name) =>
      prisma.tag.upsert({
        where: { name_kind: { name, kind: 'STYLE' } },
        update: {},
        create: { name, kind: 'STYLE' },
      })
    )
  )

  console.log(
    '✅ 创建类型标签:',
    typeTags.map((t) => t.name).join(', ')
  )
  console.log(
    '✅ 创建风格标签:',
    styleTags.map((t) => t.name).join(', ')
  )

  // 迁移：若旧 Category 表仍存在，把重叠名称挂到 TYPE 标签
  try {
    const legacyCategories = await prisma.$queryRaw<
      Array<{ id: string; name: string }>
    >`SELECT id, name FROM "Category"`
    const legacySongs = await prisma.$queryRaw<
      Array<{ id: string; categoryId: string }>
    >`SELECT id, "categoryId" FROM "Song" WHERE "categoryId" IS NOT NULL`

    const nameByCategoryId = new Map(
      legacyCategories.map((c) => [c.id, c.name] as const)
    )
    const typeByName = new Map(typeTags.map((t) => [t.name, t.id] as const))

    for (const song of legacySongs) {
      const catName = nameByCategoryId.get(song.categoryId)
      if (!catName) continue
      const tagId = typeByName.get(catName)
      if (!tagId) continue
      await prisma.songTag.upsert({
        where: { songId_tagId: { songId: song.id, tagId } },
        update: {},
        create: { songId: song.id, tagId },
      })
    }
    console.log('✅ 已尝试从旧 Category 迁移重叠标签')
  } catch {
    // Category 表不存在时跳过迁移
  }

  // 创建超级管理员账户
  const superAdminPassword = await hash('admin123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@worship.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      name: '超级管理员',
      email: 'admin@worship.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ 创建超级管理员:', superAdmin.email)

  const memberPassword = await hash('member123', 12)
  const member = await prisma.user.upsert({
    where: { email: 'member@worship.com' },
    update: {},
    create: {
      name: '普通成员',
      email: 'member@worship.com',
      password: memberPassword,
      role: 'MEMBER',
    },
  })

  console.log('✅ 创建普通成员:', member.email)

  const leaderPassword = await hash('leader123', 12)
  const leader = await prisma.user.upsert({
    where: { email: 'leader@worship.com' },
    update: {},
    create: {
      name: '领队',
      email: 'leader@worship.com',
      password: leaderPassword,
      role: 'LEADER',
    },
  })

  console.log('✅ 创建领队:', leader.email)

  const worshipTag = typeTags.find((t) => t.name === '敬拜赞美')
  const sampleSongs = [
    { title: '耶稣掌权', tagName: '敬拜赞美' },
    { title: '主是我力量', tagName: '敬拜赞美' },
    { title: '耶和华是爱', tagName: '敬拜赞美' },
    { title: '全能的创造主', tagName: '敬拜赞美' },
    { title: '深触我心', tagName: '敬拜赞美' },
    { title: '掌权的神', tagName: '敬拜赞美' },
    { title: '我的救赎主活着', tagName: '信心回应' },
    { title: '除祢以外', tagName: '信心回应' },
    { title: '一生一世', tagName: '信心回应' },
    { title: '何等恩典', tagName: '信心回应' },
  ]

  for (const song of sampleSongs) {
    const existing = await prisma.song.findFirst({
      where: { title: song.title },
    })
    if (existing) continue

    const tag = typeTags.find((t) => t.name === song.tagName) ?? worshipTag
    await prisma.song.create({
      data: {
        title: song.title,
        tags: tag
          ? {
              create: [{ tagId: tag.id }],
            }
          : undefined,
      },
    })
  }

  console.log('✅ 创建示例歌曲')

  console.log('\n=== 初始化完成 ===')
  console.log('\n测试账户：')
  console.log('  超级管理员: admin@worship.com / admin123')
  console.log('  领队: leader@worship.com / leader123')
  console.log('  普通成员: member@worship.com / member123')
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
