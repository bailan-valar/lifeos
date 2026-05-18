<template>
  <nav class="app-sidebar">
    <div class="sidebar-top">
      <div class="sidebar-logo" title="LifeOS">
        <Icon name="solar:notes-linear" class="logo-icon" />
      </div>
    </div>

    <div class="sidebar-modules">
      <NuxtLink
        v-for="mod in modules"
        :key="mod.id"
        :to="mod.path"
        class="module-item"
        :class="{ active: isActive(mod.path) }"
        :title="mod.label"
        @click.prevent="menuNavigate(mod.path)"
      >
        <Icon :name="mod.icon" class="module-icon" />
        <span class="module-label">{{ mod.label }}</span>
      </NuxtLink>
    </div>

    <div class="sidebar-bottom">
      <NuxtLink
        to="/settings/general"
        class="sidebar-btn"
        title="设置"
      >
        <Icon name="solar:settings-linear" class="sidebar-btn-icon" />
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { menuNavigate } = useRouteCache()
const authStore = useAuthStore()

const allModules = [
  { id: 'home', label: '首页', icon: 'solar:home-linear', path: '/', requiresAdmin: false },
  { id: 'notes', label: '笔记', icon: 'solar:document-text-linear', path: '/notes', requiresAdmin: false },
  { id: 'billing', label: '账单', icon: 'solar:wallet-money-linear', path: '/billing', requiresAdmin: false },
  { id: 'goals', label: '目标', icon: 'solar:target-linear', path: '/goals', requiresAdmin: false },
  { id: 'time', label: '时间', icon: 'solar:calendar-linear', path: '/time', requiresAdmin: false },
  { id: 'admin', label: '管理', icon: 'solar:shield-check-linear', path: '/__admin', requiresAdmin: true },
]

// 根据用户角色过滤显示的模块
const modules = computed(() => {
  const isAdmin = authStore.user?.role === 'admin'
  return allModules.filter(mod => !mod.requiresAdmin || isAdmin)
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 64px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-right: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.08);
  z-index: 200;
  padding: 12px 0;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

/* Liquid Glass refraction highlight */
.app-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 0% 0%,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.sidebar-top {
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(94, 92, 230, 0.12) 100%);
  border: 0.5px solid rgba(0, 122, 255, 0.2);
}

.logo-icon {
  font-size: 22px;
  color: rgb(0, 102, 230);
}

.sidebar-modules {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
}

.module-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  gap: 4px;
  border-radius: 12px;
  color: rgba(60, 60, 67, 0.55);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.module-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 60, 67, 0.85);
}

.module-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.module-icon {
  font-size: 22px;
}

.module-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: -0.2px;
}

.sidebar-bottom {
  flex-shrink: 0;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.sidebar-btn-icon {
  font-size: 20px;
}
</style>
