<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h1 class="admin-title">管理后台</h1>
        <div class="admin-badge">管理员</div>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.id"
          :to="`/__admin${item.path}`"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <Icon :name="item.icon" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <NuxtLink to="/" class="back-link">
          <Icon name="solar:alt-arrow-left-linear" class="back-icon" />
          <span>返回应用</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { id: 'dashboard', label: '仪表盘', path: '/', icon: 'solar:widget-linear' },
  { id: 'users', label: '用户管理', path: '/users', icon: 'solar:users-group-rounded-linear' },
  { id: 'feedbacks', label: '反馈管理', path: '/feedbacks', icon: 'solar:chat-square-linear' },
]

const isActive = (path: string) => {
  return route.path === `/__admin${path}` || route.path.startsWith(`/__admin${path}/`)
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}

.admin-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 0.5px solid rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.35);
}

.admin-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  letter-spacing: -0.02em;
}

.admin-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
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

.sidebar-footer {
  padding: 16px 12px;
  border-top: 0.5px solid rgba(255, 255, 255, 0.35);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  color: rgba(60, 60, 67, 0.6);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.15s ease;
}

.back-link:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 60, 67, 0.9);
}

.back-icon {
  font-size: 18px;
}

.admin-main {
  flex: 1;
  min-width: 0;
  padding: 32px;
  overflow-y: auto;
  background: transparent;
}

@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  }

  .sidebar-header {
    padding: 16px;
  }

  .admin-title {
    font-size: 18px;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding: 12px 16px;
  }

  .nav-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .sidebar-footer {
    display: none;
  }

  .admin-main {
    padding: 16px;
  }
}
</style>
