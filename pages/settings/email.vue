<template>
  <SettingsLayout>
    <div class="settings-page">
      <div class="page-header">
        <h2 class="page-title">邮箱设置</h2>
        <p class="page-desc">配置邮箱用于接收银行账单邮件</p>
      </div>

      <div class="settings-sections">
        <div class="section">
          <div class="section-label">已配置邮箱</div>
          <div class="section-card">
            <div v-if="loading" class="loading-state">
              <div class="spinner" />
            </div>

            <template v-else-if="configs.length > 0">
              <div
                v-for="config in configs"
                :key="config.id"
                class="email-config-item"
              >
                <div class="config-info">
                  <Icon :name="getProviderIcon(config.provider)" class="config-icon" />
                  <div class="config-text">
                    <div class="config-name">{{ config.name }}</div>
                    <div class="config-desc">{{ config.username }} @ {{ config.host }}</div>
                  </div>
                </div>
                <div class="config-actions">
                  <button
                    type="button"
                    class="action-btn"
                    @click="handleEdit(config)"
                  >
                    <Icon name="solar:pen-linear" />
                  </button>
                  <button
                    type="button"
                    class="action-btn danger"
                    @click="handleDelete(config)"
                  >
                    <Icon name="solar:trash-bin-trash-linear" />
                  </button>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <Icon name="solar:letter-linear" class="empty-icon" />
              <p>尚未配置邮箱</p>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-label">添加邮箱</div>
          <div class="section-card">
            <button
              type="button"
              class="add-button"
              @click="handleAdd"
            >
              <Icon name="solar:add-circle-linear" />
              <span>添加新邮箱</span>
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">使用说明</div>
          <div class="section-card info-card">
            <p class="info-text">
              配置邮箱后，在账单导入时可以选择从邮件获取银行账单附件。
            </p>
            <p class="info-text">
              请使用邮箱的<strong>授权密码</strong>而非登录密码，并确保 IMAP 服务已开启。
            </p>
            <ul class="info-list">
              <li>QQ邮箱：设置 > 账户 > IMAP/SMTP服务</li>
              <li>163邮箱：设置 > POP3/SMTP/IMAP</li>
              <li>Gmail：转发和POP/IMAP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <EmailConfigDialog
      v-if="showDialog"
      :config="editingConfig"
      @save="handleSave"
      @close="handleCloseDialog"
    />
  </SettingsLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingsLayout from '~/components/settings/SettingsLayout.vue'
import EmailConfigDialog from '~/components/settings/EmailConfigDialog.vue'
import { useEmailConfigs } from '~/composables/useEmailConfigs'
import type { EmailConfig, EmailConfigFormData } from '~/types/email'
import { useConfirm } from '~/composables/useConfirm'
import type { EmailProvider } from '~/types/email'

const { configs, loading, loadEmailConfigs, saveConfig, deleteConfig } = useEmailConfigs()
const { confirm } = useConfirm()

const showDialog = ref(false)
const editingConfig = ref<EmailConfig | null>(null)

const PROVIDER_ICONS: Record<EmailProvider, string> = {
  qq: 'solar:letter-linear',
  '163': 'solar:letter-linear',
  gmail: 'solar:letter-linear',
  outlook: 'solar:letter-linear',
  custom: 'solar:letter-linear'
}

function getProviderIcon(provider: EmailProvider): string {
  return PROVIDER_ICONS[provider] || 'solar:letter-linear'
}

async function handleAdd() {
  editingConfig.value = null
  showDialog.value = true
}

function handleEdit(config: EmailConfig) {
  editingConfig.value = config
  showDialog.value = true
}

async function handleDelete(config: EmailConfig) {
  const ok = await confirm({
    message: `确定要删除邮箱 "${config.name}" 吗？`,
    danger: true
  })
  if (!ok) return
  await deleteConfig(config.id)
}

async function handleSave(data: EmailConfigFormData) {
  if (editingConfig.value) {
    await saveConfig(data, editingConfig.value.id)
  } else {
    await saveConfig(data)
  }
  handleCloseDialog()
}

function handleCloseDialog() {
  showDialog.value = false
  editingConfig.value = null
}

onMounted(() => {
  loadEmailConfigs()
})
</script>

<style scoped>
.settings-page {
  max-width: 640px;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  margin: 0 0 6px;
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

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--liquid-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  padding-left: 4px;
}

.section-card {
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow-light);
  overflow: hidden;
  position: relative;
}

.section-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  position: relative;
  z-index: 1;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--liquid-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.email-config-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  transition: background 0.15s ease;
}

.email-config-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.email-config-item + .email-config-item {
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.config-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-icon {
  font-size: 20px;
  color: var(--liquid-text-secondary);
  flex-shrink: 0;
}

.config-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.config-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.config-desc {
  font-size: 13px;
  color: var(--liquid-text-secondary);
}

.config-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--liquid-text-primary);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  position: relative;
  z-index: 1;
}

.empty-icon {
  font-size: 48px;
  color: var(--liquid-text-tertiary);
}

.empty-state p {
  font-size: 14px;
  color: var(--liquid-text-secondary);
  margin: 0;
}

.add-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border: none;
  border-radius: var(--liquid-radius);
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-button:hover {
  background: rgba(0, 0, 0, 0.08);
}

.info-card {
  padding: 16px;
}

.info-text {
  font-size: 14px;
  color: var(--liquid-text-secondary);
  line-height: 1.6;
  margin: 0 0 12px;
}

.info-text strong {
  color: var(--liquid-text-primary);
  font-weight: 500;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--liquid-text-tertiary);
}

.info-list li {
  margin-bottom: 4px;
}

@media (max-width: 768px) {
  .settings-page {
    max-width: 100%;
  }

  .page-title {
    font-size: 20px;
  }
}
</style>
