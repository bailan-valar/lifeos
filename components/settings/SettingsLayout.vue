<template>
  <div class="settings-layout">
    <div class="settings-sidebar">
      <h2 class="settings-title">设置</h2>
      <nav class="settings-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.id"
          :to="`/settings/${item.id}`"
          class="nav-item"
          :class="{ active: isActive(item.id) }"
        >
          <Icon :name="item.icon" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>
    <div class="settings-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { id: 'general', label: '通用', icon: 'solar:settings-linear' },
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
  background: rgba(255, 255, 255, 0.5);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

.settings-sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 24px 16px;
  border-right: 0.5px solid rgba(60, 60, 67, 0.1);
}

.settings-title {
  margin: 0 0 20px 12px;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  color: rgba(60, 60, 67, 0.7);
  text-decoration: none;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 60, 67, 0.9);
}

.nav-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

.settings-content {
  flex: 1;
  min-width: 0;
  padding: 24px 32px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
    padding: 16px;
  }

  .settings-title {
    margin-bottom: 12px;
    font-size: 18px;
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

  .settings-content {
    padding: 16px;
  }
}
</style>
