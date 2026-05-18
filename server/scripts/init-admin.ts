#!/usr/bin/env tsx

/**
 * 初始化管理员脚本
 *
 * 用法：
 *   npx tsx server/scripts/init-admin.ts <user-email>
 *
 * 示例：
 *   npx tsx server/scripts/init-admin.ts admin@example.com
 *
 * 此脚本将指定邮箱的用户角色设置为 'admin'
 * 如果用户不存在，将显示错误信息
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initAdmin(email: string) {
  try {
    console.log(`🔍 查找用户: ${email}`)

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`❌ 错误: 找不到邮箱为 ${email} 的用户`)
      console.log('\n💡 提示: 请先注册该用户账户，然后再次运行此脚本')
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`✅ 用户 ${email} 已经是管理员`)
      console.log(`\n用户信息:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  邮箱: ${user.email}`)
      console.log(`  姓名: ${user.name || '未设置'}`)
      console.log(`  角色: ${user.role}`)
      process.exit(0)
    }

    // 更新用户角色为管理员
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    })

    console.log(`✅ 成功将用户 ${email} 设置为管理员`)
    console.log(`\n用户信息:`)
    console.log(`  ID: ${updatedUser.id}`)
    console.log(`  邮箱: ${updatedUser.email}`)
    console.log(`  姓名: ${updatedUser.name || '未设置'}`)
    console.log(`  角色: ${updatedUser.role}`)
    console.log(`\n🎉 现在可以使用该账户登录管理后台: /__admin`)

  } catch (error) {
    console.error('❌ 发生错误:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 获取命令行参数
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('用法: npx tsx server/scripts/init-admin.ts <user-email>')
  console.log('示例: npx tsx server/scripts/init-admin.ts admin@example.com')
  process.exit(1)
}

const email = args[0]

// 验证邮箱格式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error('❌ 错误: 无效的邮箱格式')
  process.exit(1)
}

// 执行初始化
initAdmin(email)
