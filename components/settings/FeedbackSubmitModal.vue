<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        :class="{ mobile: isMobile }"
        @click="emitClose"
      >
        <div class="modal-content" :class="{ mobile: isMobile }" @click.stop>
          <div class="modal-header">
            <h3>提交反馈</h3>
            <button class="close-btn" type="button" @click="emitClose">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
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
                  :class="{ active: form.rating >= star }"
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
                rows="5"
                maxlength="2000"
              />
              <div class="char-count">
                {{ charCount }} / 2000
              </div>
            </div>

            <div v-if="error" class="error-message">
              {{ error }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="ghost-btn" type="button" @click="emitClose">
              取消
            </button>
            <button
              class="primary-btn"
              type="button"
              :disabled="!form.content.trim() || submitting"
              @click="handleSubmit"
            >
              <Icon v-if="submitting" name="solar:widget-2-linear" class="spin-icon" />
              <span>{{ submitting ? '提交中...' : '提交反馈' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submitted'): void
}>()

const authStore = useAuthStore()
const router = useRouter()
const { isMobile } = useDevice()

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

const charCount = computed(() => form.content.length)

watch(() => props.visible, (v) => {
  if (v) {
    form.category = 'other'
    form.rating = 0
    form.content = ''
    error.value = ''
    submitting.value = false
  }
})

function emitClose() {
  emit('update:visible', false)
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
      emit('submitted')
      emitClose()
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}

.modal-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}

.modal-content {
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-content.mobile {
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.modal-body {
  flex: 1;
  min-height: 0;
  padding: 0 20px 4px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.7);
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
  transition: all 0.2s ease;
}

.category-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(60, 60, 67, 0.25);
}

.category-btn.active {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.category-icon {
  font-size: 16px;
}

.rating-options {
  display: flex;
  gap: 6px;
}

.star-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.35);
  cursor: pointer;
  transition: all 0.2s ease;
}

.star-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}

.star-btn.active {
  background: rgba(255, 149, 0, 0.12);
  border-color: rgba(255, 149, 0, 0.3);
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
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.88);
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 12px;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-textarea::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.form-textarea:focus {
  border-color: rgba(0, 122, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.error-message {
  padding: 10px 14px;
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  background: transparent;
  color: rgba(60, 60, 67, 0.85);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ghost-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  background: rgb(0, 110, 230);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-body::-webkit-scrollbar {
  width: 5px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
