import { getDB, now } from '~/services/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      return {
        success: false,
        error: '缺少类型ID'
      }
    }

    const body = await readBody(event)
    const { name, icon, color, description } = body

    if (!name || !name.trim()) {
      return {
        success: false,
        error: '类型名称不能为空'
      }
    }

    const db = await getDB()
    const existingDoc = await db.todo_types.findOne(id).exec()
    
    if (!existingDoc) {
      return {
        success: false,
        error: '待办类型不存在'
      }
    }

    const existing = existingDoc.toJSON()
    const updated = {
      ...existing,
      name: name.trim(),
      icon: icon || existing.icon,
      color: color || existing.color,
      description: description?.trim() || '',
      updatedAt: now()
    }

    await db.todo_types.upsert(updated)

    return {
      success: true,
      data: updated
    }
  } catch (error) {
    console.error('更新待办类型失败:', error)
    return {
      success: false,
      error: '更新待办类型失败'
    }
  }
})