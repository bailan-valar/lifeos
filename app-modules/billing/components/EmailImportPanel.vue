<template>
  <div class="email-import-panel">
    <div v-if="!showMailList" class="email-config-step">
      <div class="form-group">
        <label class="form-label">选择邮箱</label>
        <SelectPicker
          v-model="selectedConfigId"
          :options="emailConfigOptions"
          placeholder="选择已配置的邮箱"
          clearable
        />
      </div>

      <div v-if="selectedConfigId" class="form-group">
        <label class="form-label">授权密码</label>
        <input
          v-model="emailPassword"
          type="password"
          class="liquid-glass-input"
          placeholder="请输入邮箱授权密码"
          @keyup.enter="handleFetchMails"
        />
      </div>

      <div v-if="errorMsg" class="error-msg">
        <Icon name="solar:danger-circle-linear" />
        {{ errorMsg }}
      </div>

      <button
        type="button"
        class="fetch-button liquid-glass-button liquid-glass-button-primary"
        :disabled="!selectedConfigId || !emailPassword || isFetching"
        @click="handleFetchMails"
      >
        <Icon v-if="isFetching" name="solar:refresh-linear" class="spin-icon" />
        {{ isFetching ? '获取邮件中...' : '获取邮件列表' }}
      </button>

      <div class="form-hint">
        <Icon name="solar:info-circle-linear" />
        首次使用请前往「设置 > 邮箱」配置邮箱
      </div>
    </div>

    <div v-else class="mail-list-step">
      <div class="mail-list-header">
        <button
          type="button"
          class="back-button"
          @click="handleBack"
        >
          <Icon name="solar:alt-arrow-left-linear" />
          返回
        </button>
        <span class="mail-count">共 {{ mails.length }} 封邮件</span>
      </div>

      <div class="mail-list">
        <div
          v-for="mail in mails"
          :key="mail.id"
          class="mail-item"
          :class="{ selected: selectedMailId === mail.id }"
          @click="handleSelectMail(mail)"
        >
          <div class="mail-icon">
            <Icon name="solar:letter-linear" />
          </div>
          <div class="mail-info">
            <div class="mail-from">{{ mail.from }}</div>
            <div class="mail-subject">{{ mail.subject }}</div>
            <div class="mail-meta">
              <span class="mail-date">{{ formatDate(mail.date) }}</span>
              <span v-if="mail.hasAttachment" class="mail-attachment">
                <Icon name="solar:attachment-linear" />
                {{ mail.attachments.length }} 个附件
              </span>
            </div>
          </div>
          <div v-if="mail.hasAttachment" class="mail-attachments-preview">
            <div
              v-for="(att, idx) in mail.attachments.slice(0, 3)"
              :key="idx"
              class="attachment-badge"
            >
              {{ att.filename }}
            </div>
            <div v-if="mail.attachments.length > 3" class="attachment-more">
              +{{ mail.attachments.length - 3 }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedMail" class="mail-detail">
        <div class="detail-header">
          <span class="detail-label">已选择</span>
          <span class="detail-subject">{{ selectedMail.subject }}</span>
        </div>
        <div class="attachment-list">
          <div
            v-for="(att, idx) in selectedMail.attachments"
            :key="idx"
            class="attachment-item"
          >
            <Icon name="solar:file-linear" />
            <span class="attachment-name">{{ att.filename }}</span>
            <span class="attachment-size">{{ formatSize(att.size) }}</span>
            <button
              type="button"
              class="download-btn"
              @click="handleDownloadAttachment(selectedMail.id, idx)"
            >
              下载并导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SelectPicker from '~/components/SelectPicker.vue'
import type { EmailConfig, Email } from '~/types/email'
import { fetchEmails, downloadAttachment, detectImportSourceFromFilename } from '~/services/emailService'
import { useEmailConfigs } from '~/composables/useEmailConfigs'

const props = defineProps<{
  noteId: string
}>()

const emit = defineEmits<{
  (e: 'file-loaded', file: { name: string; content: ArrayBuffer; source: 'alipay' | 'wechat' | 'cmb' | 'cmb_credit' }): void
}>()

const { configs } = useEmailConfigs()

const selectedConfigId = ref('')
const emailPassword = ref('')
const isFetching = ref(false)
const errorMsg = ref('')
const showMailList = ref(false)
const mails = ref<Email[]>([])
const selectedMailId = ref('')

const emailConfigOptions = computed(() => {
  return configs.value.map(c => ({
    label: `${c.name} (${c.username})`,
    value: c.id
  }))
})

const selectedMail = computed(() => {
  return mails.value.find(m => m.id === selectedMailId.value)
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function handleFetchMails() {
  if (!selectedConfigId.value || !emailPassword.value) return

  isFetching.value = true
  errorMsg.value = ''

  try {
    const result = await fetchEmails({
      configId: selectedConfigId.value,
      password: emailPassword.value,
      limit: 20,
      days: 30
    })

    if (result.success) {
      mails.value = result.emails.filter(m => m.hasAttachment)
      if (mails.value.length === 0) {
        errorMsg.value = '未找到带附件的邮件'
      } else {
        showMailList.value = true
      }
    } else {
      errorMsg.value = result.error || '获取邮件失败'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '获取邮件失败'
  } finally {
    isFetching.value = false
  }
}

function handleBack() {
  showMailList.value = false
  selectedMailId.value = ''
  mails.value = []
}

function handleSelectMail(mail: Email) {
  selectedMailId.value = mail.id
}

async function handleDownloadAttachment(emailId: string, attachmentIndex: number) {
  const result = await downloadAttachment(
    selectedConfigId.value,
    emailPassword.value,
    emailId,
    attachmentIndex
  )

  if (result.success && result.data && result.filename) {
    const content = base64ToArrayBuffer(result.data)
    const source = detectImportSourceFromFilename(result.filename) || 'alipay'

    emit('file-loaded', {
      name: result.filename,
      content,
      source
    })
  } else {
    errorMsg.value = result.error || '下载附件失败'
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

watch(() => configs, () => {
  if (configs.value.length === 1) {
    selectedConfigId.value = configs.value[0].id
  }
}, { immediate: true })
</script>

<style scoped>
.email-import-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-secondary);
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 8px;
  color: rgb(255, 59, 48);
  font-size: 13px;
}

.fetch-button {
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mail-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: var(--liquid-border);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: none;
  color: var(--liquid-text-secondary);
  cursor: pointer;
  font-size: 14px;
}

.back-button:hover {
  color: var(--liquid-text-primary);
}

.mail-count {
  font-size: 13px;
  color: var(--liquid-text-tertiary);
}

.mail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.mail-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mail-item:hover {
  background: var(--liquid-bg);
}

.mail-item.selected {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.3);
}

.mail-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mail-info {
  flex: 1;
  min-width: 0;
}

.mail-from {
  font-size: 14px;
  font-weight: 500;
  color: var(--liquid-text-primary);
  margin-bottom: 2px;
}

.mail-subject {
  font-size: 13px;
  color: var(--liquid-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.mail-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.mail-attachment {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mail-attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.attachment-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  color: var(--liquid-text-tertiary);
}

.attachment-more {
  font-size: 11px;
  padding: 2px 6px;
  color: var(--liquid-text-tertiary);
}

.mail-detail {
  padding: 12px;
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-label {
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.detail-subject {
  font-size: 14px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.attachment-name {
  flex: 1;
  font-size: 13px;
  color: var(--liquid-text-primary);
}

.attachment-size {
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.download-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.download-btn:hover {
  background: rgb(0, 106, 225);
}
</style>
