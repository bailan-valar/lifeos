<template>
  <SettingsLayout>
    <div class="settings-page">
      <div class="page-header">
        <h2 class="page-title">通用设置</h2>
        <p class="page-desc">管理应用的外观和基本行为</p>
      </div>

      <div class="settings-sections">
        <!-- 外观 -->
        <div class="section">
          <div class="section-label">外观</div>
          <div class="section-card">
            <div class="setting-row">
              <div class="setting-info">
                <Icon name="solar:moon-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">深色模式</div>
                  <div class="setting-desc">切换应用为深色主题</div>
                </div>
              </div>
              <button
                type="button"
                class="toggle"
                :class="{ on: darkMode }"
                @click="darkMode = !darkMode"
              >
                <span class="toggle-knob" />
              </button>
            </div>

            <div class="setting-divider" />

            <div class="setting-row">
              <div class="setting-info">
                <Icon name="solar:letter-spacing-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">紧凑布局</div>
                  <div class="setting-desc">减小列表项之间的间距</div>
                </div>
              </div>
              <button
                type="button"
                class="toggle"
                :class="{ on: compact }"
                @click="compact = !compact"
              >
                <span class="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <!-- 语言与地区 -->
        <div class="section">
          <div class="section-label">语言与地区</div>
          <div class="section-card">
            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:global-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">语言</div>
                  <div class="setting-desc">简体中文</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>

            <div class="setting-divider" />

            <div class="setting-row clickable">
              <div class="setting-info">
                <Icon name="solar:calendar-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">日期格式</div>
                  <div class="setting-desc">YYYY-MM-DD</div>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="row-chevron" />
            </div>
          </div>
        </div>

        <!-- 通知 -->
        <div class="section">
          <div class="section-label">通知</div>
          <div class="section-card">
            <div class="setting-row">
              <div class="setting-info">
                <Icon name="solar:bell-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">启用通知</div>
                  <div class="setting-desc">接收预算提醒和系统消息</div>
                </div>
              </div>
              <button
                type="button"
                class="toggle"
                :class="{ on: notifications }"
                @click="notifications = !notifications"
              >
                <span class="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <!-- 数据 -->
        <div class="section">
          <div class="section-label">数据</div>
          <div class="section-card">
            <div class="setting-row clickable danger">
              <div class="setting-info">
                <Icon name="solar:trash-bin-trash-linear" class="setting-icon" />
                <div class="setting-text">
                  <div class="setting-name">清除缓存</div>
                  <div class="setting-desc">删除本地临时数据</div>
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
import SettingsLayout from '~/components/settings/SettingsLayout.vue'

const darkMode = ref(false)
const compact = ref(false)
const notifications = ref(true)
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
