import { getDB, generateId, now } from '~/services/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, icon, color, description } = body

    if (!name || !name.trim()) {
      return {
        success: false,
        error: '类型名称不能为空'
      }
    }

    const db = await getDB()
    
    // 获取当前最大order值
    const existingDocs = await db.todo_types.find().exec()
    const maxOrder = existingDocs.length > 0 
      ? Math.max(...existingDocs.map(doc => doc.toJSON().order))
      : 0

    const newType = {
      id: generateId(),
      name: name.trim(),
      icon: icon || 'solar:check-circle-linear',
      color: color || '#3b82f6',
      description: description?.trim() || '',
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now()
    }

    await db.todo_types.insert(newType)

    return {
      success: true,
      data: newType
    }
  } catch (error) {
    console.error('创建待办类型失败:', error)
    return {
      success: false,
      error: '创建待办类型失败'
    }
  }
})