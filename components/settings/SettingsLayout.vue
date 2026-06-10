<template>
  <div class="settings-layout">
    <!-- 渐变背景层 -->
    <div class="settings-bg" aria-hidden="true" />

    <div class="settings-sidebar liquid-glass-sidebar">
      <div class="sidebar-refraction" aria-hidden="true" />
      <h2 class="settings-title">设置</h2>
      <nav class="settings-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.id"
          :to="`/settings/${item.id}`"
          class="nav-item"
          :class="{ active: isActive(item.id) }"
        >
          <div class="nav-icon-wrap">
            <Icon :name="item.icon" class="nav-icon" />
          </div>
          <span class="nav-label">{{ item.label }}</span>
          <Icon name="solar:alt-arrow-right-linear" class="nav-chevron" />
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <span class="version">LifeOS v1.0</span>
      </div>
    </div>

    <div class="settings-content">
      <div class="content-card liquid-glass-card">
        <div class="card-refraction" aria-hidden="true" />
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { id: 'general', label: '通用', icon: 'solar:settings-linear' },
  { id: 'email', label: '邮箱', icon: 'solar:letter-linear' },
  { id: 'account', label: '账户', icon: 'solar:user-linear' },
  { id: 'feedback', label: '反馈', icon: 'solar:chat-square-linear' },
]

const isActive = (id: string) => {
  return route.path.endsWith(`/settings/${id}`) || route.path === `/settings/${id}`
}
</script>

<style scoped>
.settings-layout {
  display: flex;
  min-height: 100%;
  position: relative;
}

/* 渐变背景 —— 参考账单页 */
.settings-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.45) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.45) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.35) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
  pointer-events: none;
}

.settings-sidebar {
  position: relative;
  z-index: 1;
  width: 260px;
  flex-shrink: 0;
  padding: 28px 16px 16px;
  display: flex;
  flex-direction: column;
}

.sidebar-refraction {
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
}

.settings-title {
  position: relative;
  z-index: 1;
  margin: 0 0 20px 12px;
  font-size: 24px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.02em;
}

.settings-nav {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--liquid-text-secondary);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background 0.2s ease;
  border-radius: inherit;
}

.nav-item:hover {
  color: var(--liquid-text-primary);
}

.nav-item:hover::before {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 122, 255, 0.15);
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 0.5px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.nav-item.active .nav-icon-wrap {
  background: rgba(0, 122, 255, 0.15);
  border-color: rgba(0, 122, 255, 0.25);
}

.nav-icon {
  font-size: 18px;
}

.nav-label {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
}

.nav-chevron {
  font-size: 14px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.25);
}

.nav-item:hover .nav-chevron,
.nav-item.active .nav-chevron {
  opacity: 1;
  transform: translateX(0);
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 16px;
  text-align: center;
}

.version {
  font-size: 11px;
  color: var(--liquid-text-tertiary);
  letter-spacing: 0.02em;
}

.settings-content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  padding: 28px 32px;
  overflow-y: auto;
}

.content-card {
  position: relative;
  min-height: calc(100% - 56px);
  padding: 28px 32px;
}

.card-refraction {
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.content-card > :deep(*) {
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
    padding: 16px;
    border-right: none;
    border-bottom: var(--liquid-border);
  }

  .settings-title {
    margin-bottom: 12px;
    font-size: 20px;
  }

  .settings-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
  }

  .nav-item {
    flex-shrink: 0;
    padding: 8px 14px;
    white-space: nowrap;
  }

  .nav-chevron {
    display: none;
  }

  .sidebar-footer {
    display: none;
  }

  .settings-content {
    padding: 16px;
  }

  .content-card {
    padding: 20px;
  }
}
</style>
