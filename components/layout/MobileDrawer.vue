<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="drawer-overlay"
        @click="close"
      />
    </Transition>

    <!-- 抽屉 -->
    <Transition name="slide">
      <nav v-if="modelValue" class="mobile-drawer">
        <div class="drawer-header">
          <span class="drawer-title">LifeOS</span>
          <button class="drawer-close" type="button" @click="close">
            <Icon name="solar:close-circle-linear" size="22" />
          </button>
        </div>

        <div class="drawer-modules">
          <NuxtLink
            v-for="mod in modules"
            :key="mod.id"
            :to="mod.path"
            class="drawer-item"
            :class="{ active: isActive(mod.path) }"
            @click.prevent="navigate(mod.path)"
          >
            <Icon :name="mod.icon" class="drawer-item-icon" />
            <span class="drawer-item-label">{{ mod.label }}</span>
          </NuxtLink>
        </div>

        <div class="drawer-footer">
          <button class="drawer-footer-btn" type="button" @click="emit('open-settings')">
            <Icon name="solar:settings-linear" size="18" />
            <span>设置</span>
          </button>
        </div>
      </nav>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'open-settings'): void
}>()

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

function close() {
  emit('update:modelValue', false)
}

function navigate(path: string) {
  menuNavigate(path)
  close()
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  z-index: var(--z-drawer);
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 72vw;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-right: 0.5px solid rgba(255, 255, 255, 0.4);
  box-shadow: 8px 0 40px rgba(0, 0, 0, 0.15);
  z-index: calc(var(--z-drawer) + 1);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(94, 92, 230));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.drawer-close:active {
  opacity: 0.6;
}

.drawer-modules {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 16px;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  color: rgba(60, 60, 67, 0.7);
  text-decoration: none;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.drawer-item-icon {
  font-size: 22px;
}

.drawer-item-label {
  font-size: 16px;
  font-weight: 500;
}

.drawer-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.drawer-item:active {
  opacity: 0.7;
}

.drawer-footer {
  flex-shrink: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 0.5px solid rgba(60, 60, 67, 0.08);
}

.drawer-footer-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(60, 60, 67, 0.7);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.drawer-footer-btn:active {
  background: rgba(0, 0, 0, 0.04);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
