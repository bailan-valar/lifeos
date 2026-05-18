<template>
  <div class="feedback-form-container">
    <div class="feedback-header">
      <h3>用户反馈</h3>
      <p class="feedback-desc">您的反馈对我们非常重要，帮助我们改进产品</p>
    </div>

    <form @submit.prevent="handleSubmit" class="feedback-form">
      <div class="form-group">
        <label class="form-label">反馈类型</label>
        <div class="category-options">
          <button
            v-for="cat in categories"
            :key="cat.value"
            type="button"
            class="category-btn"
            :class="{ active: form.category === cat.value }"
            @click="form.category = cat.value"
          >
            <Icon :name="cat.icon" class="category-icon" />
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">评分（可选）</label>
        <div class="rating-options">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="star-btn"
            :class="{ active: form.rating === star }"
            @click="form.rating = star"
          >
            <Icon
              :name="form.rating >= star ? 'solar:star-bold' : 'solar:star-linear'"
              class="star-icon"
            />
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">反馈内容</label>
        <textarea
          v-model="form.content"
          class="form-textarea"
          placeholder="请详细描述您的反馈..."
          rows="6"
          maxlength="2000"
          @input="updateCharCount"
        />
        <div class="char-count">
          {{ charCount }} / 2000
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button
        type="submit"
        class="submit-btn"
        :disabled="!form.content.trim() || submitting"
      >
        <Icon v-if="submitting" name="solar:widget-2-linear" class="spin-icon" />
        <span>{{ submitting ? '提交中...' : '提交反馈' }}</span>
      </button>
    </form>

    <div v-if="userFeedbacks.length > 0" class="feedback-history">
      <h4>我的反馈</h4>
      <div class="feedback-list">
        <div
          v-for="item in userFeedbacks"
          :key="item.id"
          class="feedback-item"
        >
          <div class="feedback-item-header">
            <span class="feedback-category">{{ getCategoryLabel(item.category) }}</span>
            <span class="feedback-date">{{ formatDate(item.createdAt) }}</span>
          </div>
          <p class="feedback-content">{{ item.content }}</p>
          <div v-if="item.rating" class="feedback-rating">
            <Icon
              v-for="star in 5"
              :key="star"
              :name="item.rating >= star ? 'solar:star-bold' : 'solar:star-linear'"
              class="rating-star"
              size="14"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const categories = [
  { value: 'bug', label: 'Bug', icon: 'solar:danger-circle-linear' },
  { value: 'feature', label: '功能建议', icon: 'solar:star-linear' },
  { value: 'ui', label: '界面', icon: 'solar:monitor-linear' },
  { value: 'performance', label: '性能', icon: 'solar:bolt-linear' },
  { value: 'other', label: '其他', icon: 'solar:menu-dots-linear' },
]

const form = reactive({
  category: 'other',
  rating: 0,
  content: '',
})

const submitting = ref(false)
const error = ref('')
const charCount = ref(0)
const userFeedbacks = ref<any[]>([])

onMounted(() => {
  if (!authStore.user) {
    router.push('/login')
    return
  }
  loadFeedbacks()
})

async function loadFeedbacks() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const response = await $fetch('/api/feedback', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response && typeof response === 'object' && 'success' in response && response.success) {
      userFeedbacks.value = (response as any).data || []
    }
  } catch (e) {
    console.warn('Failed to load feedbacks:', e)
  }
}

function updateCharCount() {
  charCount.value = form.content.length
}

async function handleSubmit() {
  if (!form.content.trim()) {
    error.value = '请填写反馈内容'
    return
  }

  if (form.content.length > 2000) {
    error.value = '反馈内容不能超过 2000 字符'
    return
  }

  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/feedback', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        content: form.content,
        category: form.category,
        rating: form.rating || null,
      },
    }) as { success: boolean }

    if (response.success) {
      form.content = ''
      form.category = 'other'
      form.rating = 0
      charCount.value = 0
      await loadFeedbacks()
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function getCategoryLabel(category: string): string {
  const cat = categories.find(c => c.value === category)
  return cat?.label || '其他'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.feedback-form-container {
  max-width: 600px;
}

.feedback-header {
  margin-bottom: 24px;
}

.feedback-header h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.feedback-desc {
  margin: 0;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.6);
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.75);
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.category-btn.active {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.category-icon {
  font-size: 16px;
}

.rating-options {
  display: flex;
  gap: 4px;
}

.star-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.3);
  cursor: pointer;
  transition: all 0.15s ease;
}

.star-btn:hover {
  background: rgba(60, 60, 67, 0.05);
  color: rgba(60, 60, 67, 0.6);
}

.star-btn.active .star-icon {
  color: #ff9500;
}

.star-icon {
  font-size: 22px;
}

.form-textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.9);
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 12px;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.form-textarea::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.error-message {
  padding: 10px 14px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border-radius: 10px;
  font-size: 13px;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
  transition: transform 0.15s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.feedback-history {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.feedback-history h4 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-item {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.08);
}

.feedback-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.feedback-category {
  padding: 2px 8px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.feedback-date {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.feedback-content {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.feedback-rating {
  display: flex;
  gap: 2px;
}

.rating-star {
  color: #ff9500;
}
</style>
