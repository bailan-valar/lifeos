import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdmins() {
  try {
    // 查询所有用户
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`\n📊 总用户数: ${allUsers.length}\n`)

    if (allUsers.length === 0) {
      console.log('⚠️  数据库中还没有用户')
      console.log('💡 请先注册一个用户账户\n')
      return
    }

    // 查询管理员用户
    const adminUsers = allUsers.filter(user => user.role === 'admin')

    console.log('👑 管理员用户列表:')
    console.log('━'.repeat(60))

    if (adminUsers.length === 0) {
      console.log('❌ 当前没有管理员用户')
      console.log('💡 你可以使用以下命令将某个用户设置为管理员:')
      console.log('   npx tsx server/scripts/init-admin.ts <user-email>\n')
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`)
        console.log(`   姓名: ${user.name || '未设置'}`)
        console.log(`   角色: ${user.role}`)
        console.log(`   创建时间: ${user.createdAt.toLocaleString('zh-CN')}`)
        console.log()
      })
    }

    console.log('━'.repeat(60))
    console.log('\n所有用户列表:')

    allUsers.forEach((user, index) => {
      const roleBadge = user.role === 'admin' ? '👑 管理员' : '👤 用户'
      console.log(`${index + 1}. ${user.email} - ${roleBadge}`)
    })

    console.log()

  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmins()
