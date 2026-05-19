<template>
  <SettingsLayout>
    <div class="api-page">
      <!-- 页面头部 -->
      <div class="page-header">
        <button class="back-btn" @click="$router.back()">
          <Icon name="solar:alt-arrow-left-linear" />
        </button>
        <div class="header-info">
          <h1 class="page-title">API Token</h1>
          <p class="page-desc">管理用于 API 调用的访问令牌</p>
        </div>
      </div>

      <!-- Token 列表 -->
      <div class="tokens-section">
        <div class="section-header">
          <span class="section-title">我的 Token</span>
          <button class="create-btn" @click="showCreateDialog = true">
            <Icon name="solar:add-circle-linear" />
            <span>新建 Token</span>
          </button>
        </div>

        <!-- Token 列表 -->
        <div v-if="!loading && tokens.length > 0" class="token-list">
          <div
            v-for="token in tokens"
            :key="token.id"
            class="token-card"
            :class="{ expired: token.isExpired }"
          >
            <div class="token-main">
              <div class="token-info">
                <div class="token-name">{{ token.name }}</div>
                <div class="token-meta">
                  <span class="token-value">{{ token.token }}</span>
                  <span class="token-divider">·</span>
                  <span class="token-date">
                    创建于 {{ formatDate(token.createdAt) }}
                  </span>
                </div>
              </div>
              <div class="token-status">
                <span v-if="token.isExpired" class="status-badge expired">已过期</span>
                <span v-else-if="token.expiresAt" class="status-badge">
                  {{ getExpiryText(token.expiresAt) }}
                </span>
                <span v-else class="status-badge permanent">永久有效</span>
              </div>
            </div>
            <div class="token-actions">
              <button class="action-btn danger" @click="confirmDelete(token)">
                <Icon name="solar:trash-bin-minimalistic-linear" />
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="empty-state">
          <Icon name="solar:key-minimalistic-square-linear" class="empty-icon" />
          <p class="empty-text">暂无 API Token</p>
          <p class="empty-hint">创建 Token 后可用于 API 调用认证</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <div class="spinner" />
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="usage-section">
        <div class="section-title">使用说明</div>
        <div class="usage-card">
          <p class="usage-text">
            在 API 请求头中添加 <code>Authorization</code> 字段：
          </p>
          <pre class="code-block"><code>Authorization: Bearer &lt;your-api-token&gt;</code></pre>
          <p class="usage-warning">
            <Icon name="solar:danger-triangle-linear" />
            Token 创建后只显示一次，请妥善保管
          </p>
        </div>
      </div>

      <!-- 创建 Token 对话框 -->
      <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
        <div class="dialog">
          <div class="dialog-header">
            <h3 class="dialog-title">创建 API Token</h3>
            <button class="dialog-close" @click="showCreateDialog = false">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label class="form-label">Token 名称</label>
              <input
                v-model="newToken.name"
                type="text"
                class="liquid-glass-input"
                placeholder="例如：开发环境测试"
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label class="form-label">过期时间（可选）</label>
              <select v-model="newToken.expiresIn" class="liquid-glass-select">
                <option :value="null">永久有效</option>
                <option :value="30">30 天后过期</option>
                <option :value="90">90 天后过期</option>
                <option :value="180">180 天后过期</option>
                <option :value="365">1 年后过期</option>
              </select>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="liquid-glass-button" @click="showCreateDialog = false">
              取消
            </button>
            <button
              class="liquid-glass-button liquid-glass-button-primary"
              :disabled="creating || !newToken.name"
              @click="createToken"
            >
              <template v-if="creating">
                <div class="btn-spinner" />
                创建中...
              </template>
              <template v-else>创建</template>
            </button>
          </div>
        </div>
      </div>

      <!-- 新建 Token 显示对话框 -->
      <div v-if="showNewTokenDialog" class="dialog-overlay" @click.self="closeNewTokenDialog">
        <div class="dialog new-token-dialog">
          <div class="dialog-header">
            <h3 class="dialog-title">Token 创建成功</h3>
          </div>

          <div class="dialog-body">
            <p class="new-token-hint">
              请立即复制并保存此 Token，关闭后将无法再次查看完整内容
            </p>
            <div class="token-display">
              <code class="token-code">{{ createdToken }}</code>
              <button class="copy-large-btn" :class="{ copied: copiedCreatedToken }" @click="copyCreatedToken">
                <Icon :name="copiedCreatedToken ? 'solar:check-circle-linear' : 'solar:copy-linear'" />
                {{ copiedCreatedToken ? '已复制' : '复制' }}
              </button>
            </div>
          </div>

          <div class="dialog-footer">
            <button
              class="liquid-glass-button liquid-glass-button-primary"
              @click="closeNewTokenDialog"
            >
              我已保存
            </button>
          </div>
        </div>
      </div>

      <!-- 删除确认对话框 -->
      <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="showDeleteDialog = false">
        <div class="dialog">
          <div class="dialog-header">
            <h3 class="dialog-title">删除 Token</h3>
            <button class="dialog-close" @click="showDeleteDialog = false">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="dialog-body">
            <p class="delete-hint">
              确定要删除 Token <strong>{{ deletingToken?.name }}</strong> 吗？
            </p>
            <p class="delete-warning">删除后无法恢复，使用此 Token 的 API 调用将失效</p>
          </div>

          <div class="dialog-footer">
            <button class="liquid-glass-button" @click="showDeleteDialog = false">
              取消
            </button>
            <button
              class="liquid-glass-button danger"
              :disabled="deleting"
              @click="deleteToken"
            >
              <template v-if="deleting">
                <div class="btn-spinner" />
                删除中...
              </template>
              <template v-else>删除</template>
            </button>
          </div>
        </div>
      </div>

      <!-- Toast 提示 -->
      <div v-if="toast.show" class="toast" :class="toast.type">
        <Icon :name="toast.icon" class="toast-icon" />
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>
  </SettingsLayout>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import SettingsLayout from '~/components/settings/SettingsLayout.vue'

interface ApiToken {
  id: string
  name: string
  token: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  isExpired: boolean
}

const authStore = useAuthStore()
const loading = ref(true)
const tokens = ref<ApiToken[]>([])

const showCreateDialog = ref(false)
const showNewTokenDialog = ref(false)
const showDeleteDialog = ref(false)

const creating = ref(false)
const deleting = ref(false)

const newToken = ref({
  name: '',
  expiresIn: null as number | null,
})

const createdToken = ref('')
const deletingToken = ref<ApiToken | null>(null)

const toast = ref({
  show: false,
  message: '',
  type: 'success',
  icon: 'solar:check-circle-linear',
})

const copiedCreatedToken = ref(false)

// 加载 Token 列表
async function loadTokens() {
  loading.value = true
  try {
    const response = await $fetch('/api/user/api-tokens', {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    if (response && (response as any).success) {
      tokens.value = (response as any).data
    }
  } catch (error: any) {
    showToast(error.message || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

// 创建 Token
async function createToken() {
  if (!newToken.value.name.trim()) return

  creating.value = true
  try {
    const expiresAt = newToken.value.expiresIn
      ? new Date(Date.now() + newToken.value.expiresIn * 24 * 60 * 60 * 1000).toISOString()
      : null

    const response = await $fetch('/api/user/api-tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
      body: {
        name: newToken.value.name.trim(),
        expiresAt,
      },
    })

    if (response && (response as any).success) {
      createdToken.value = (response as any).data.token
      showCreateDialog.value = false
      showNewTokenDialog.value = true
      newToken.value = { name: '', expiresIn: null }
      await loadTokens()
    }
  } catch (error: any) {
    showToast(error.message || '创建失败', 'error')
  } finally {
    creating.value = false
  }
}

// 删除 Token
async function deleteToken() {
  if (!deletingToken.value) return

  deleting.value = true
  try {
    await $fetch(`/api/user/api-tokens/${deletingToken.value.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    showDeleteDialog.value = false
    deletingToken.value = null
    showToast('Token 已删除')
    await loadTokens()
  } catch (error: any) {
    showToast(error.message || '删除失败', 'error')
  } finally {
    deleting.value = false
  }
}

function confirmDelete(token: ApiToken) {
  deletingToken.value = token
  showDeleteDialog.value = true
}

function closeNewTokenDialog() {
  showNewTokenDialog.value = false
  createdToken.value = ''
  copiedCreatedToken.value = false
}

async function copyCreatedToken() {
  const token = createdToken.value
  let success = false

  // 优先使用 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(token)
      success = true
    } catch {
      // 降级到传统方法
    }
  }

  // 降级方案：使用 textarea + execCommand
  if (!success) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = token
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      success = successful
    } catch {
      success = false
    }
  }

  if (success) {
    copiedCreatedToken.value = true
    showToast('已复制到剪贴板')
    setTimeout(() => {
      copiedCreatedToken.value = false
    }, 2000)
  } else {
    showToast('复制失败，请手动复制', 'error')
  }
}

// 显示提示
function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = {
    show: true,
    message,
    type,
    icon: type === 'success' ? 'solar:check-circle-linear' : 'solar:close-circle-linear',
  }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 月前`
  return `${Math.floor(days / 365)} 年前`
}

// 获取过期文本
function getExpiryText(expiresAt: string) {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days <= 0) return '已过期'
  if (days === 1) return '1 天后过期'
  if (days < 30) return `${days} 天后过期`
  if (days < 365) return `${Math.floor(days / 30)} 月后过期`
  return `${Math.floor(days / 365)} 年后过期`
}

onMounted(() => {
  loadTokens()
})
</script>

<style scoped>
.api-page {
  max-width: 640px;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--liquid-bg-thin);
  border-radius: 10px;
  cursor: pointer;
  color: var(--liquid-text-primary);
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: var(--liquid-bg);
}

.header-info {
  flex: 1;
}

.page-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.02em;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--liquid-text-secondary);
}

/* Token 列表区域 */
.tokens-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-left: 4px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--liquid-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-primary);
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius-button);
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn:hover {
  background: var(--liquid-bg);
}

.create-btn svg {
  font-size: 16px;
}

/* Token 卡片 */
.token-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow-light);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.token-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
}

.token-card.expired {
  opacity: 0.6;
}

.token-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.token-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--liquid-text-secondary);
}

.token-value {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
}

.token-divider {
  color: var(--liquid-text-tertiary);
}

.token-status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  border-radius: 6px;
}

.status-badge.expired {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.status-badge.permanent {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.token-actions {
  display: flex;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--liquid-text-secondary);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: var(--liquid-text-tertiary);
  margin-bottom: 16px;
}

.empty-text {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 500;
  color: var(--liquid-text-secondary);
}

.empty-hint {
  margin: 0;
  font-size: 14px;
  color: var(--liquid-text-tertiary);
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--liquid-text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 使用说明 */
.usage-section {
  margin-bottom: 24px;
}

.usage-section .section-title {
  margin-bottom: 10px;
  padding-left: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--liquid-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.usage-card {
  padding: 16px;
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow-light);
}

.usage-text {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--liquid-text-secondary);
}

.code-block {
  margin: 0 0 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  overflow-x: auto;
}

.code-block code {
  display: block;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 13px;
  color: #34c759;
}

.usage-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: #ff9500;
}

.usage-warning svg {
  font-size: 16px;
  flex-shrink: 0;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(var(--liquid-blur-thick)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur-thick)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thick);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow);
  overflow: hidden;
}

.new-token-dialog {
  max-width: 480px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--liquid-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.new-token-hint {
  margin: 0 0 16px;
  font-size: 14px;
  color: #ff9500;
  line-height: 1.5;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
}

.token-code {
  flex: 1;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 13px;
  color: #34c759;
  word-break: break-all;
}

.copy-large-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-primary);
  background: var(--liquid-bg);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius-button);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.copy-large-btn:hover {
  background: var(--liquid-bg-thick);
}

.copy-large-btn.copied {
  color: #34c759;
  background: rgba(52, 199, 89, 0.15);
}

.delete-hint {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--liquid-text-primary);
}

.delete-hint strong {
  font-weight: 600;
}

.delete-warning {
  margin: 0;
  font-size: 14px;
  color: #ff3b30;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px 20px;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius-button);
  box-shadow: var(--liquid-shadow);
  z-index: 2000;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.toast.error {
  background: rgba(255, 59, 48, 0.15);
}

.toast-icon {
  font-size: 18px;
}

.toast.success .toast-icon {
  color: #34c759;
}

.toast.error .toast-icon {
  color: #ff3b30;
}

.toast-message {
  font-size: 14px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

/* 禁用状态 */
.liquid-glass-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.liquid-glass-button.danger {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.liquid-glass-button.danger:hover {
  background: rgba(255, 59, 48, 0.25);
}

@media (max-width: 768px) {
  .api-page {
    max-width: 100%;
  }

  .page-title {
    font-size: 20px;
  }

  .token-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .token-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
