import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const version = '1.2.0'
const releaseDate = new Date('2026-05-19')

const changelogs = [
  {
    version,
    type: 'improvement',
    title: '记账模块交互优化',
    description: '优化记账模块的组件结构和用户交互体验，新增账单列表项、预算历史等组件，操作更加流畅直观。',
    releaseDate,
  },
  {
    version,
    type: 'fix',
    title: '修复金额计算精度问题',
    description: '统一使用高精度计算工具，彻底解决金额计算中的浮点数误差问题，确保账目数据准确无误。',
    releaseDate,
  },
]

async function main() {
  // 检查是否已存在相同版本的记录
  const existing = await prisma.changelog.findMany({
    where: { version },
  })

  if (existing.length > 0) {
    console.log(`版本 ${version} 已存在 ${existing.length} 条记录，跳过插入`)
    console.log('已有记录：')
    existing.forEach(e => console.log(`  - ${e.title}`))
    return
  }

  const result = await prisma.changelog.createMany({
    data: changelogs,
  })

  console.log(`成功插入 ${result.count} 条更新日志记录（版本 ${version}）`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
