import { getDB } from '~/services/db'

export default defineEventHandler(async (event) => {
  try {
    const db = await getDB()
    const docs = await db.todo_types.find().exec()
    const types = docs.map(doc => doc.toJSON())
    
    return {
      success: true,
      data: types
    }
  } catch (error) {
    console.error('获取待办类型失败:', error)
    return {
      success: false,
      error: '获取待办类型失败'
    }
  }
})