<template>
  <nav class="mobile-tabbar">
    <NuxtLink
      v-for="mod in modules"
      :key="mod.id"
      :to="mod.path"
      class="tab-item"
      :class="{ active: isActive(mod.path) }"
      @click.prevent="menuNavigate(mod.path)"
    >
      <div class="tab-icon-wrap">
        <Icon :name="mod.icon" class="tab-icon" />
      </div>
      <span class="tab-label">{{ mod.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { menuNavigate } = useRouteCache()

const modules = [
  { id: 'notes', label: '笔记', icon: 'solar:document-text-linear', path: '/notes' },
  { id: 'billing', label: '账单', icon: 'solar:wallet-money-linear', path: '/billing' },
  { id: 'todo', label: '目标', icon: 'solar:check-read-linear', path: '/todo' },
]

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-top: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: var(--z-drawer);
}

/* Liquid Glass 折射高光 */
.mobile-tabbar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.tab-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  color: rgba(60, 60, 67, 0.5);
  text-decoration: none;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.tab-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 28px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.tab-icon {
  font-size: 22px;
  transition: all 0.2s ease;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: -0.2px;
  transition: all 0.2s ease;
}

.tab-item.active {
  color: rgb(0, 122, 255);
}

.tab-item.active .tab-icon-wrap {
  background: rgba(0, 122, 255, 0.12);
}

.tab-item:active {
  opacity: 0.7;
}
</style>
