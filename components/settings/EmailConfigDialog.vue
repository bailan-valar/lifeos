<template>
  <BaseDialog
    :visible="visible"
    :title="config ? '编辑邮箱配置' : '添加邮箱配置'"
    size="medium"
    @close="handleClose"
  >
    <div class="dialog-content">
      <div class="form-group">
        <label class="form-label">配置名称</label>
        <input
          v-model="formData.name"
          type="text"
          class="liquid-glass-input"
          placeholder="如：QQ邮箱、163邮箱"
        />
      </div>

      <div class="form-group">
        <label class="form-label">邮箱服务商</label>
        <SelectPicker
          v-model="formData.provider"
          :options="providerOptions"
          placeholder="选择邮箱服务商"
        />
      </div>

      <div v-if="formData.provider === 'custom'" class="form-group">
        <label class="form-label">IMAP 服务器地址</label>
        <input
          v-model="formData.host"
          type="text"
          class="liquid-glass-input"
          placeholder="如：imap.example.com"
        />
      </div>

      <div v-if="formData.provider === 'custom'" class="form-group">
        <label class="form-label">端口</label>
        <input
          v-model.number="formData.port"
          type="number"
          class="liquid-glass-input"
          placeholder="993"
        />
      </div>

      <div class="form-group">
        <label class="form-label">邮箱账号</label>
        <input
          v-model="formData.username"
          type="email"
          class="liquid-glass-input"
          placeholder="your@email.com"
        />
      </div>

      <div class="form-group">
        <label class="form-label">授权密码</label>
        <input
          v-model="formData.password"
          type="password"
          class="liquid-glass-input"
          placeholder="邮箱授权密码（非登录密码）"
        />
        <p class="form-hint">请使用邮箱的授权密码或应用专用密码</p>
      </div>

      <div v-if="errorMsg" class="error-msg">
        <Icon name="solar:danger-circle-linear" />
        {{ errorMsg }}
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="liquid-glass-button"
          @click="handleClose"
        >
          取消
        </button>
        <button
          type="button"
          class="liquid-glass-button liquid-glass-button-primary"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? '测试连接中...' : '测试连接并保存' }}
        </button>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import SelectPicker from '~/components/ui/SelectPicker.vue'
import type { EmailConfig, EmailConfigFormData, EmailProvider } from '~/types/email'
import { EMAIL_PROVIDER_CONFIGS } from '~/types/email'
import { testEmailConnection } from '~/services/emailService'

const props = defineProps<{
  visible: boolean
  config?: EmailConfig | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: EmailConfigFormData]
}()

const formData = ref<EmailConfigFormData>({
  name: '',
  provider: 'qq',
  host: '',
  port: 993,
  username: '',
  password: '',
  tls: true
})

const isSubmitting = ref(false)
const errorMsg = ref('')

const providerOptions = computed(() => {
  return Object.entries(EMAIL_PROVIDER_CONFIGS).map(([key, val]) => ({
    label: val.label,
    value: key
  }))
})

watch(() => props.config, (config) => {
  if (config) {
    formData.value = {
      name: config.name,
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      password: '',
      tls: config.tls
    }
  } else {
    resetForm()
  }
})

watch(() => props.visible, (visible) => {
  if (!visible) {
    resetForm()
  }
})

watch(() => formData.value.provider, (provider) => {
  if (provider !== 'custom') {
    const preset = EMAIL_PROVIDER_CONFIGS[provider]
    formData.value.host = preset.host
    formData.value.port = preset.port
    formData.value.tls = preset.tls
  }
})

function resetForm() {
  formData.value = {
    name: '',
    provider: 'qq',
    host: EMAIL_PROVIDER_CONFIGS.qq.host,
    port: EMAIL_PROVIDER_CONFIGS.qq.port,
    username: '',
    password: '',
    tls: true
  }
  errorMsg.value = ''
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.username || !formData.value.password) {
    errorMsg.value = '请填写完整信息'
    return
  }

  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const result = await testEmailConnection(
      {
        id: '',
        name: formData.value.name,
        provider: formData.value.provider,
        host: formData.value.host,
        port: formData.value.port,
        username: formData.value.username,
        encryptedPassword: '',
        tls: formData.value.tls,
        createdAt: '',
        updatedAt: ''
      },
      formData.value.password
    )

    if (result.success) {
      emit('save', { ...formData.value })
    } else {
      errorMsg.value = result.error || '连接测试失败，请检查配置信息'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '连接测试失败'
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.dialog-content {
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
  font-size: 12px;
  color: var(--liquid-text-tertiary);
  margin: 0;
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

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.liquid-glass-button {
  min-width: 100px;
}

.liquid-glass-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
