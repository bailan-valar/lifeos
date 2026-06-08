import { getDB, generateId, now } from '~/services/db'
import { onCollectionChange } from '~/services/db'
import type { TodoComment } from '~/types/todo'

export function useTodoComments() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 加载指定待办的所有评论（按创建时间倒序）
  const loadComments = async (todoId: string): Promise<TodoComment[]> => {
    try {
      loading.value = true
      error.value = null

      const db = await getDB()
      const commentDocs = await db.todo_comments.find({
        selector: { todoId },
        sort: [{ createdAt: 'desc' }]
      }).exec()

      return commentDocs.map(doc => doc.toJSON() as TodoComment)
    } catch (err) {
      console.error('加载评论失败:', err)
      error.value = '加载评论失败'
      return []
    } finally {
      loading.value = false
    }
  }

  // 添加评论
  const addComment = async (todoId: string, content: string): Promise<TodoComment | null> => {
    try {
      if (!content.trim()) {
        throw new Error('评论内容不能为空')
      }

      const db = await getDB()
      const comment: TodoComment = {
        id: generateId(),
        todoId,
        content: content.trim(),
        createdAt: now(),
        updatedAt: now()
      }

      await db.todo_comments.insert(comment)
      return comment
    } catch (err) {
      console.error('添加评论失败:', err)
      error.value = '添加评论失败'
      return null
    }
  }

  // 删除评论
  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const db = await getDB()
      const commentDoc = await db.todo_comments.findOne(commentId).exec()

      if (!commentDoc) {
        console.warn('评论不存在:', commentId)
        return false
      }

      await commentDoc.remove()
      return true
    } catch (err) {
      console.error('删除评论失败:', err)
      error.value = '删除评论失败'
      return false
    }
  }

  // 监听评论变更
  const onCommentsChange = (callback: () => void) => {
    return onCollectionChange('todo_comments', callback)
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    loadComments,
    addComment,
    deleteComment,
    onCommentsChange
  }
}
