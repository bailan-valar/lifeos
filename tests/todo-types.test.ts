// 待办类型管理功能测试脚本
// 这个脚本可以用来测试待办类型的CRUD操作

async function testTodoTypes() {
  console.log('开始测试待办类型管理功能...')

  try {
    // 测试数据库连接
    const { getDB, generateId, now } = await import('../services/db')
    const db = await getDB()
    console.log('✅ 数据库连接成功')

    // 测试创建待办类型
    const testType = {
      id: generateId(),
      name: '测试类型',
      icon: 'solar:check-circle-linear',
      color: '#3b82f6',
      description: '这是一个测试类型',
      order: 1,
      createdAt: now(),
      updatedAt: now()
    }

    await db.todo_types.insert(testType)
    console.log('✅ 创建待办类型成功')

    // 测试查询待办类型
    const docs = await db.todo_types.find().exec()
    const types = docs.map(doc => doc.toJSON())
    console.log(`✅ 查询待办类型成功，找到 ${types.length} 个类型`)

    // 测试更新待办类型
    await db.todo_types.upsert({
      ...testType,
      name: '更新后的测试类型',
      description: '这是更新后的描述',
      updatedAt: now()
    })
    console.log('✅ 更新待办类型成功')

    // 测试删除待办类型
    const doc = await db.todo_types.findOne(testType.id).exec()
    if (doc) {
      await doc.remove()
      console.log('✅ 删除待办类型成功')
    }

    console.log('🎉 所有测试通过！')
    return true

  } catch (error) {
    console.error('❌ 测试失败:', error)
    return false
  }
}

// 导出测试函数供页面调用
if (typeof window !== 'undefined') {
  (window as any).testTodoTypes = testTodoTypes
}

export { testTodoTypes }