<template>
  <SettingsLayout>
    <div class="settings-page">
      <div class="page-header">
        <h2 class="page-title">设置</h2>
        <p class="page-desc">管理您的应用偏好和账户信息</p>
      </div>

      <div class="settings-sections">
        <!-- 快速入口 -->
        <div class="section">
          <div class="section-label">快速入口</div>
          <div class="quick-grid">
            <NuxtLink
              v-for="item in quickItems"
              :key="item.id"
              :to="`/settings/${item.id}`"
              class="quick-card"
            >
              <div class="quick-icon-wrap" :style="{ background: item.bg }">
                <Icon :name="item.icon" class="quick-icon" />
              </div>
              <span class="quick-label">{{ item.label }}</span>
              <span class="quick-desc">{{ item.desc }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 关于 -->
        <div class="section">
          <div class="section-label">关于</div>
          <div class="section-card">
            <div class="setting-row">
              <div class="setting-info">
                <Icon name="solar:info-circle-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">版本</div>
                </div>
              </div>
              <span class="meta-value">1.0.0</span>
            </div>

            <div class="setting-divider" />

            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:document-text-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">服务条款</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>

            <div class="setting-divider" />

            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:shield-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">隐私政策</div>
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
import SettingsLayout from '~/components/settings/SettingsLayout.vue'

const quickItems = [
  {
    id: 'general',
    label: '通用',
    desc: '外观、语言、通知',
    icon: 'solar:settings-linear',
    bg: 'linear-gradient(135deg, rgba(0,122,255,0.12), rgba(0,122,255,0.04))',
  },
  {
    id: 'account',
    label: '账户',
    desc: '信息、安全、退出',
    icon: 'solar:user-linear',
    bg: 'linear-gradient(135deg, rgba(52,199,89,0.12), rgba(52,199,89,0.04))',
  },
  {
    id: 'feedback',
    label: '反馈',
    desc: '建议、问题、评分',
    icon: 'solar:chat-square-linear',
    bg: 'linear-gradient(135deg, rgba(255,149,0,0.12), rgba(255,149,0,0.04))',
  },
]
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

/* Quick Grid Cards */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow-light);
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.25s ease;
  position: relative;
  overflow: hidden;
}

.quick-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--liquid-shadow);
}

.quick-card:active {
  transform: scale(0.97);
}

.quick-icon-wrap {
  position: relative;
  z-index: 1;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(255, 255, 255, 0.2);
}

.quick-icon {
  font-size: 22px;
  color: var(--liquid-text-primary);
}

.quick-label {
  position: relative;
  z-index: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.quick-desc {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: var(--liquid-text-secondary);
  text-align: center;
  line-height: 1.3;
}

/* Section Card (About) */
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

.meta-value {
  font-size: 15px;
  color: var(--liquid-text-secondary);
  font-weight: 500;
}

.row-chevron {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .settings-page {
    max-width: 100%;
  }

  .page-title {
    font-size: 20px;
  }

  .quick-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .quick-card {
    padding: 16px 8px;
  }

  .quick-icon-wrap {
    width: 40px;
    height: 40px;
  }

  .quick-icon {
    font-size: 20px;
  }

  .quick-desc {
    display: none;
  }
}

@media (max-width: 480px) {
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .quick-card {
    flex-direction: row;
    padding: 14px 16px;
    justify-content: flex-start;
  }

  .quick-desc {
    display: block;
    margin-left: auto;
  }
}
</style>
