<template>
  <SettingsLayout>
    <div class="settings-page">
      <div class="page-header">
        <h2 class="page-title">账户设置</h2>
        <p class="page-desc">管理您的账户信息和安全选项</p>
      </div>

      <div class="settings-sections">
        <!-- 用户信息 -->
        <div class="section">
          <div class="section-label">用户信息</div>
          <div class="section-card">
            <div class="profile-row">
              <div class="avatar">
                <Icon name="solar:user-linear" class="avatar-icon" />
              </div>
              <div class="profile-info">
                <div class="profile-name">{{ authStore.user?.name || '未登录' }}</div>
                <div class="profile-email">{{ authStore.user?.email || '' }}</div>
              </div>
            </div>

            <div class="setting-divider" />

            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:pen-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">修改昵称</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>

            <div class="setting-divider" />

            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:gallery-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">更换头像</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>
          </div>
        </div>

        <!-- 安全 -->
        <div class="section">
          <div class="section-label">安全</div>
          <div class="section-card">
            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:lock-keyhole-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">修改密码</div>
                  <div class="setting-desc">建议定期更换密码</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>

            <div class="setting-divider" />

            <div class="setting-row">
              <div class="setting-info">
                <Icon name="solar:shield-check-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">双重验证</div>
                  <div class="setting-desc">提升账户安全性</div>
                </div>
              </div>
              <button
                type="button"
                class="toggle"
                :class="{ on: twoFactor }"
                @click="twoFactor = !twoFactor"
              >
                <span class="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <!-- 会话 -->
        <div class="section">
          <div class="section-label">会话</div>
          <div class="section-card">
            <div class="setting-row clickable danger">
              <div class="setting-info">
                <Icon name="solar:logout-2-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">退出登录</div>
                  <div class="setting-desc">清除本地登录状态</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </SettingsLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import SettingsLayout from '~/components/settings/SettingsLayout.vue'

const authStore = useAuthStore()
const twoFactor = ref(false)
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

.profile-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.15), rgba(0, 122, 255, 0.05));
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 24px;
  color: rgb(0, 122, 255);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.profile-email {
  font-size: 14px;
  color: var(--liquid-text-secondary);
}

.setting-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  transition: background 0.15s ease;
}

.setting-row.clickable {
  cursor: pointer;
}

.setting-row.clickable:hover {
  background: rgba(255, 255, 255, 0.06);
}

.setting-row.clickable:active {
  background: rgba(255, 255, 255, 0.03);
}

.setting-divider {
  height: 0.5px;
  margin: 0 16px;
  background: rgba(0, 0, 0, 0.06);
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  font-size: 20px;
  color: var(--liquid-text-secondary);
  flex-shrink: 0;
}

.setting-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--liquid-text-secondary);
}

.row-chevron {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.danger .setting-name {
  color: rgb(255, 59, 48);
}

.danger .setting-icon {
  color: rgb(255, 59, 48);
}

/* Toggle Switch */
.toggle {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  padding: 2px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
  transition: background 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.toggle.on {
  background: rgb(52, 199, 89);
}

.toggle-knob {
  display: block;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateX(0);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toggle.on .toggle-knob {
  transform: translateX(20px);
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
