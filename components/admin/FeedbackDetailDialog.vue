<template>
  <div v-if="isOpen" class="dialog-overlay" @click="close">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <h2 class="dialog-title">反馈详情</h2>
        <button class="close-btn" @click="close">
          <Icon name="solar:close-circle-linear" />
        </button>
      </div>

      <form @submit.prevent="handleStatusUpdate">
        <!-- 反馈内容 -->
        <div class="feedback-detail">
          <div class="detail-user">
            <div class="user-avatar">
              {{ feedback.user.name?.charAt(0)?.toUpperCase() || feedback.user.email.charAt(0).toUpperCase() }}
            </div>
            <div class="user-info">
              <div class="user-name">{{ feedback.user.name || '未设置名称' }}</div>
              <div class="user-email">{{ feedback.user.email }}</div>
            </div>
          </div>

          <div class="detail-meta">
            <span class="detail-category">{{ getCategoryLabel(feedback.category) }}</span>
            <div v-if="feedback.rating" class="detail-rating">
              <Icon
                v-for="i in 5"
                :key="i"
                :name="i <= (feedback.rating || 0) ? 'solar:star-bold' : 'solar:star-linear'"
                :class="{ active: i <= (feedback.rating || 0) }"
              />
            </div>
          </div>

          <div class="detail-content">
            <p>{{ feedback.content }}</p>
          </div>

          <div class="detail-time">
            {{ formatFullDate(feedback.createdAt) }}
          </div>
        </div>

        <div class="divider"></div>

        <!-- 对话记录 -->
        <div class="conversation-section">
          <h3 class="conversation-title">对话记录</h3>

          <div v-if="isLoadingReplies" class="loading-replies">
            <Icon name="solar:refresh-linear" class="loading-icon" />
          </div>

          <div v-else-if="replies.length === 0" class="no-replies">
            暂无对话记录
          </div>

          <div v-else class="conversation-list">
            <div
              v-for="reply in replies"
              :key="reply.id"
              :class="['message-bubble', reply.isAdmin ? 'admin' : 'user']"
            >
              <!-- 管理员回复 -->
              <template v-if="reply.isAdmin">
                <div class="bubble-avatar">
                  {{ reply.user.name?.[0] || reply.user.email[0] }}
                </div>
                <div class="bubble-content">
                  <div class="bubble-header">
                    <span class="bubble-author">
                      {{ reply.user.name || reply.user.email }}
                    </span>
                    <span class="bubble-time">
                      {{ formatTime(reply.createdAt) }}
                    </span>
                  </div>
                  <p class="bubble-text">{{ reply.content }}</p>
                  <div class="bubble-actions">
                    <button
                      type="button"
                      class="action-btn"
                      @click="editReply(reply)"
                    >
                      <Icon name="solar:pen-linear" />
                      编辑
                    </button>
                    <button
                      type="button"
                      class="action-btn danger"
                      @click="confirmDeleteReply(reply)"
                    >
                      <Icon name="solar:trash-bin-trash-linear" />
                      删除
                    </button>
                  </div>
                </div>
              </template>

              <!-- 用户回复 -->
              <template v-else>
                <div class="bubble-content">
                  <div class="bubble-header">
                    <span class="bubble-time">
                      {{ formatTime(reply.createdAt) }}
                    </span>
                    <span class="bubble-author">
                      {{ feedback.user.name || '用户' }}
                    </span>
                  </div>
                  <p class="bubble-text">{{ reply.content }}</p>
                </div>
                <div class="bubble-avatar">
                  {{ feedback.user.name?.[0] || feedback.user.email[0] }}
                </div>
              </template>
            </div>
          </div>

          <!-- 新回复输入 -->
          <div class="new-reply-section">
            <div class="form-group">
              <label class="form-label">添加回复</label>
              <textarea
                v-model="newReplyContent"
                class="form-textarea"
                placeholder="输入回复内容..."
                rows="3"
                maxlength="2000"
              ></textarea>
              <div class="form-hint">
                {{ newReplyContent.length }} / 2000 字符
              </div>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!newReplyContent.trim() || isSendingReply"
              @click="sendReply"
            >
              {{ isSendingReply ? '发送中...' : '发送回复' }}
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- 状态更新 -->
        <div class="status-section">
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="formData.status" class="form-select">
              <option value="pending">待处理</option>
              <option value="in_progress">处理中</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" @click="close">
            取消
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存状态' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 编辑回复弹窗 -->
    <div v-if="isEditDialogOpen" class="dialog-overlay" @click="closeEditDialog">
      <div class="dialog-container edit-dialog" @click.stop>
        <div class="dialog-header">
          <h2 class="dialog-title">编辑回复</h2>
          <button class="close-btn" @click="closeEditDialog">
            <Icon name="solar:close-circle-linear" />
          </button>
        </div>

        <form @submit.prevent="updateReply">
          <div class="form-group">
            <label class="form-label">回复内容</label>
            <textarea
              v-model="editReplyContent"
              class="form-textarea"
              rows="5"
              maxlength="2000"
            ></textarea>
            <div class="form-hint">
              {{ editReplyContent.length }} / 2000 字符
            </div>
          </div>

          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" @click="closeEditDialog">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isUpdatingReply">
              {{ isUpdatingReply ? '更新中...' : '更新' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FeedbackReply {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface Feedback {
  id: string
  content: string
  category: string
  rating: number | null
  status: string
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  replies?: FeedbackReply[]
}

interface Props {
  feedback: Feedback
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'saved'])

const isOpen = ref(true)
const isLoading = ref(false)
const isLoadingReplies = ref(false)
const replies = ref<FeedbackReply[]>([...(props.feedback.replies || [])])

// 加载对话记录
onMounted(async () => {
  try {
    isLoadingReplies.value = true
    const token = localStorage.getItem('token')
    if (!token) return

    const response = await $fetch(`/api/__admin/feedbacks/${props.feedback.id}/replies`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    replies.value = (response as any).data || []
  }
  catch (error: any) {
    console.error('加载对话记录失败:', error)
  }
  finally {
    isLoadingReplies.value = false
  }
})

// 新回复
const newReplyContent = ref('')
const isSendingReply = ref(false)

// 编辑回复
const isEditDialogOpen = ref(false)
const editingReply = ref<FeedbackReply | null>(null)
const editReplyContent = ref('')
const isUpdatingReply = ref(false)

// 表单数据
const formData = ref({
  status: props.feedback.status,
})

// 关闭弹窗
const close = () => {
  isOpen.value = false
  emit('close')
}

// 更新状态
const handleStatusUpdate = async () => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    await $fetch(`/api/__admin/feedbacks/${props.feedback.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        status: formData.value.status,
      },
    })

    emit('saved')
    close()
  }
  catch (error: any) {
    if (error.data) {
      alert(`保存失败: ${error.data.message}`)
    } else {
      alert(`保存失败: ${error.message}`)
    }
  } finally {
    isLoading.value = false
  }
}

// 发送回复
const sendReply = async () => {
  if (!newReplyContent.value.trim()) return

  try {
    isSendingReply.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch(`/api/__admin/feedbacks/${props.feedback.id}/replies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        content: newReplyContent.value.trim(),
      },
    }) as any

    // 添加到回复列表
    replies.value.push(response.data)
    newReplyContent.value = ''
  }
  catch (error: any) {
    if (error.data) {
      alert(`发送失败: ${error.data.message}`)
    } else {
      alert(`发送失败: ${error.message}`)
    }
  } finally {
    isSendingReply.value = false
  }
}

// 编辑回复
const editReply = (reply: FeedbackReply) => {
  editingReply.value = reply
  editReplyContent.value = reply.content
  isEditDialogOpen.value = true
}

const closeEditDialog = () => {
  isEditDialogOpen.value = false
  editingReply.value = null
  editReplyContent.value = ''
}

const updateReply = async () => {
  if (!editingReply.value) return

  try {
    isUpdatingReply.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch(`/api/__admin/feedbacks/replies/${editingReply.value.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        content: editReplyContent.value.trim(),
      },
    }) as any

    // 更新回复列表
    const index = replies.value.findIndex(r => r.id === editingReply.value!.id)
    if (index !== -1) {
      replies.value[index] = response.data
    }

    closeEditDialog()
  }
  catch (error: any) {
    if (error.data) {
      alert(`更新失败: ${error.data.message}`)
    } else {
      alert(`更新失败: ${error.message}`)
    }
  } finally {
    isUpdatingReply.value = false
  }
}

// 删除回复
const confirmDeleteReply = (reply: FeedbackReply) => {
  if (confirm(`确定要删除这条回复吗？\n\n${reply.content.substring(0, 50)}...`)) {
    deleteReply(reply.id)
  }
}

const deleteReply = async (replyId: string) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    await $fetch(`/api/__admin/feedbacks/replies/${replyId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // 从回复列表中移除
    replies.value = replies.value.filter(r => r.id !== replyId)
  }
  catch (error: any) {
    if (error.data) {
      alert(`删除失败: ${error.data.message}`)
    } else {
      alert(`删除失败: ${error.message}`)
    }
  }
}

// 获取分类标签
const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    bug: 'Bug',
    feature: '功能建议',
    ui: '界面优化',
    performance: '性能问题',
    other: '其他',
  }
  return labels[category] || category
}

// 格式化完整日期
const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化时间（用于对话气泡）
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
    })
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-container {
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.edit-dialog {
  max-width: 500px;
  max-height: 50vh;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
}

form {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.feedback-detail {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  margin-bottom: 20px;
}

.detail-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.user-email {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-category {
  padding: 6px 12px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
}

.detail-rating {
  display: flex;
  gap: 4px;
}

.detail-rating .icon {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.15);
}

.detail-rating .icon.active {
  color: rgb(255, 204, 0);
}

.detail-content {
  margin-bottom: 12px;
}

.detail-content p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-time {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
}

.divider {
  height: 0.5px;
  background: rgba(60, 60, 67, 0.1);
  margin: 20px 0;
}

.conversation-section {
  margin-bottom: 20px;
}

.conversation-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.loading-replies {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.loading-icon {
  font-size: 24px;
  color: rgba(0, 0, 0, 0.3);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.no-replies {
  padding: 20px;
  text-align: center;
  color: rgba(0, 0, 0, 0.4);
  font-size: 14px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.message-bubble {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.message-bubble.admin {
  flex-direction: row;
}

.message-bubble.user {
  flex-direction: row-reverse;
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  flex-shrink: 0;
}

.message-bubble.admin .bubble-avatar {
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
}

.message-bubble.user .bubble-avatar {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.6);
}

.bubble-content {
  max-width: 70%;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-bubble.admin .bubble-header {
  flex-direction: row;
}

.message-bubble.user .bubble-header {
  flex-direction: row-reverse;
}

.bubble-author {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.bubble-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

.bubble-text {
  margin: 0;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 12px;
  word-break: break-word;
  white-space: pre-wrap;
}

.message-bubble.admin .bubble-text {
  background: rgba(0, 122, 255, 0.08);
  color: rgba(0, 0, 0, 0.8);
  border-bottom-left-radius: 4px;
}

.message-bubble.user .bubble-text {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.8);
  border-bottom-right-radius: 4px;
}

.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.new-reply-section {
  padding-top: 16px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.status-section {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 12px;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  transition: all 0.15s ease;
  font-family: inherit;
}

.form-select:focus,
.form-textarea:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.4);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  text-align: right;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: rgb(0, 122, 255);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: rgb(0, 110, 230);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .dialog-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .dialog-header,
  form {
    padding: 20px;
  }

  .bubble-content {
    max-width: 80%;
  }
}
</style>
