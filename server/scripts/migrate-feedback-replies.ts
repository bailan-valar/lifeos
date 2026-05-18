import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 将现有的 adminReply 数据迁移到新的 FeedbackReply 表
 *
 * 注意：这个脚本假设 Feedback 模型还没有删除 adminReply 等字段
 * 如果已经删除，需要先恢复这些字段
 */
export async function migrateFeedbackReplies() {
  console.log('开始迁移反馈回复数据...')

  try {
    // 查找所有有 adminReply 的反馈
    const feedbacksWithReplies = await prisma.feedback.findMany({
      where: {
        adminReply: {
          not: null,
        },
      },
    })

    console.log(`找到 ${feedbacksWithReplies.length} 条需要迁移的反馈`)

    if (feedbacksWithReplies.length === 0) {
      console.log('没有需要迁移的数据')
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const feedback of feedbacksWithReplies) {
      try {
        // 创建对应的 FeedbackReply 记录
        await prisma.feedbackReply.create({
          data: {
            feedbackId: feedback.id,
            userId: feedback.repliedBy || 'system', // 如果没有回复者，使用 system（需要创建一个系统用户或使用管理员ID）
            content: feedback.adminReply!,
            isAdmin: true,
            createdAt: feedback.repliedAt || feedback.createdAt,
            updatedAt: feedback.repliedAt || feedback.createdAt,
          },
        })

        successCount++
        console.log(`✓ 成功迁移反馈 ${feedback.id}`)
      }
      catch (error) {
        errorCount++
        console.error(`✗ 迁移反馈 ${feedback.id} 失败:`, error)
      }
    }

    console.log('\n迁移完成！')
    console.log(`成功: ${successCount} 条`)
    console.log(`失败: ${errorCount} 条`)

    // 提示：迁移成功后，可以删除 Feedback 模型的旧字段
    console.log('\n下一步：')
    console.log('1. 验证迁移结果')
    console.log('2. 如果一切正常，可以删除 Feedback 模型的以下字段：')
    console.log('   - adminReply')
    console.log('   - repliedAt')
    console.log('   - repliedBy')
    console.log('   - replier 关系')
  }
  catch (error) {
    console.error('迁移过程中发生错误:', error)
    throw error
  }
  finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateFeedbackReplies()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}
