import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('开始初始化数据...\n')

  // 创建默认分类
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: '敬拜赞美' },
      update: {},
      create: { name: '敬拜赞美' },
    }),
    prisma.category.upsert({
      where: { name: '诗歌' },
      update: {},
      create: { name: '诗歌' },
    }),
    prisma.category.upsert({
      where: { name: '圣诞诗歌' },
      update: {},
      create: { name: '圣诞诗歌' },
    }),
    prisma.category.upsert({
      where: { name: '复活节诗歌' },
      update: {},
      create: { name: '复活节诗歌' },
    }),
    prisma.category.upsert({
      where: { name: '圣餐诗歌' },
      update: {},
      create: { name: '圣餐诗歌' },
    }),
    prisma.category.upsert({
      where: { name: '其他' },
      update: {},
      create: { name: '其他' },
    }),
  ])

  console.log('✅ 创建分类:', categories.map(c => c.name).join(', '))

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

  // 创建普通成员示例账户
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

  // 创建领队示例账户
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

  // 创建一些示例歌曲
  const defaultCategory = categories.find(c => c.name === '其他')
  if (defaultCategory) {
    const sampleSongs = [
      { title: '耶稣掌权', category: '敬拜赞美' },
      { title: '主是我力量', category: '敬拜赞美' },
      { title: '耶和华是爱', category: '敬拜赞美' },
      { title: '全能的创造主', category: '敬拜赞美' },
      { title: '深触我心', category: '敬拜赞美' },
      { title: '掌权的神', category: '敬拜赞美' },
      { title: '我的救赎主活着', category: '诗歌' },
      { title: '除祢以外', category: '诗歌' },
      { title: '一生一世', category: '诗歌' },
      { title: '何等恩典', category: '诗歌' },
    ]

    for (const song of sampleSongs) {
      const category = categories.find(c => c.name === song.category)
      if (category) {
        await prisma.song.upsert({
          where: { id: song.title },
          update: {},
          create: {
            title: song.title,
            categoryId: category.id,
          },
        })
      }
    }

    console.log('✅ 创建示例歌曲')
  }

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
