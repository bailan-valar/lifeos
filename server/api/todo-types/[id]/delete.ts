import { getDB } from '~/services/db'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      return {
        success: false,
        error: '缺少类型ID'
      }
    }

    const db = await getDB()
    const doc = await db.todo_types.findOne(id).exec()
    
    if (!doc) {
      return {
        success: false,
        error: '待办类型不存在'
      }
    }

    await doc.remove()

    return {
      success: true,
      data: { id }
    }
  } catch (error) {
    console.error('删除待办类型失败:', error)
    return {
      success: false,
      error: '删除待办类型失败'
    }
  }
})