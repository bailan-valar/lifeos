<template>
  <div class="comment-input">
    <textarea
      ref="textareaRef"
      v-model="content"
      class="liquid-glass-input comment-textarea"
      placeholder="添加评论..."
      rows="2"
      maxlength="1000"
      @keydown.ctrl.enter="handleSubmit"
      @keydown.meta.enter="handleSubmit"
    />
    <div class="comment-footer">
      <span class="char-count">{{ content.length }} / 1000</span>
      <button
        class="liquid-glass-button liquid-glass-button-primary send-btn"
        :disabled="!content.trim() || isSending"
        @click="handleSubmit"
      >
        <Icon :name="ICONS.checkCircle || 'solar:check-circle-linear'" :size="16" />
        <span>发送</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'

interface Props {
  todoId: string
}

interface Emits {
  (e: 'submit', content: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const content = ref('')
const isSending = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 提交评论
const handleSubmit = async () => {
  if (!content.value.trim() || isSending.value) return

  isSending.value = true
  emit('submit', content.value.trim())

  // 等待外部处理完成后清空
  nextTick(() => {
    content.value = ''
    isSending.value = false
    textareaRef.value?.focus()
  })
}

// 暴露 focus 方法
defineExpose({
  focus: () => textareaRef.value?.focus()
})
</script>

<style scoped>
.comment-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-textarea {
  resize: vertical;
  min-height: 60px;
  max-height: 120px;
  font-family: inherit;
  line-height: 1.4;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.char-count {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.4);
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  white-space: nowrap;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .char-count {
    color: rgba(255, 255, 255, 0.4);
  }
}
</style>
