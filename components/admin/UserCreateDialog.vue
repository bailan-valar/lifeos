<template>
  <div v-if="isOpen" class="dialog-overlay" @click="close">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <h2 class="dialog-title">创建新用户</h2>
        <button class="close-btn" @click="close">
          <Icon name="solar:close-circle-linear" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">邮箱 *</label>
          <input
            v-model="formData.email"
            type="email"
            class="form-input"
            required
            placeholder="user@example.com"
          />
        </div>

        <div class="form-group">
          <label class="form-label">密码 *</label>
          <div class="password-input-wrapper">
            <input
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              required
              placeholder="至少6位密码"
              minlength="6"
            />
            <button
              type="button"
              class="toggle-password-btn"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'solar:eye-linear' : 'solar:eye-closed-linear'" />
            </button>
          </div>
          <p v-if="formData.password && formData.password.length < 6" class="form-hint warning">
            密码长度至少为6位
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">确认密码 *</label>
          <input
            v-model="formData.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            class="form-input"
            required
            placeholder="再次输入密码"
          />
          <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" class="form-hint warning">
            两次密码输入不一致
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">姓名</label>
          <input
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="用户姓名"
          />
        </div>

        <div class="form-group">
          <label class="form-label">角色</label>
          <SelectPicker
            v-model="formData.role"
            :options="roleOptions"
            placeholder="选择角色"
          />
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" @click="close">
            取消
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isLoading || !isFormValid"
          >
            {{ isLoading ? '创建中...' : '创建用户' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close', 'created'])

const isOpen = ref(true)
const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 角色选项
const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' }
]

// 表单数据
const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  role: 'user',
})

// 表单验证
const isFormValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.password &&
    formData.value.confirmPassword &&
    formData.value.password.length >= 6 &&
    formData.value.password === formData.value.confirmPassword
  )
})

// 关闭弹窗
const close = () => {
  isOpen.value = false
  emit('close')
}

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value) {
    return
  }

  try {
    isLoading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    await $fetch('/api/__admin/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        email: formData.value.email,
        password: formData.value.password,
        name: formData.value.name || null,
        role: formData.value.role,
      },
    })

    emit('created')
    close()
  } catch (error: any) {
    if (error.data) {
      alert(`创建失败: ${error.data.message}`)
    } else {
      alert(`创建失败: ${error.message}`)
    }
  } finally {
    isLoading.value = false
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  z-index: 10;
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

.form-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 12px;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.4);
}

.form-input::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper .form-input {
  padding-right: 44px;
}

.toggle-password-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.toggle-password-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
}

.form-hint {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.form-hint.warning {
  color: rgb(255, 149, 0);
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
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
}
</style>
