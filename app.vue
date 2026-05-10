<template>
  <div class="app-root">
    <template v-if="!isAuthPage">
      <AppSidebar v-if="!isMobile" @open-settings="classManagerVisible = true" />

      <div class="app-main" :class="{ 'mobile': isMobile }">
        <!-- 桌面端 Menubar -->
        <header v-if="!isMobile" class="app-menubar">
          <div class="menubar-left">
            <span class="page-title">{{ pageTitle }}</span>
          </div>
          <div class="menubar-right">
            <WorkspaceSwitcher />
          </div>
        </header>

        <!-- 移动端 Header -->
        <header v-if="isMobile" class="mobile-header">
          <button class="header-menu-btn" type="button" @click="drawerOpen = true">
            <Icon name="solar:hamburger-menu-linear" size="22" />
          </button>
          <span class="header-title">{{ pageTitle }}</span>
          <div class="header-spacer" />
        </header>

        <div class="app-content" :class="{ 'mobile': isMobile }">
          <NuxtPage :keepalive="{ max: 10 }" :page-key="pageKey" :key="workspaceStore.currentId" />
        </div>
      </div>

      <!-- 移动端左侧抽屉 -->
      <MobileDrawer v-if="isMobile" v-model="drawerOpen" @open-settings="classManagerVisible = true" />

      <ClassManager v-if="hasWorkspace" ref="classManagerRef" v-model:visible="classManagerVisible" @created="onClassCreated" />
    </template>

    <NuxtPage v-else class="flex-1 min-w-0" />

    <GlobalFab v-if="!isAuthPage && hasWorkspace" />

    <ToastContainer />
    <ConfirmDialog />

    <WorkspaceOnboarding v-if="!hasWorkspace && !isAuthPage" @created="onWorkspaceCreated" />
  </div>
</template>

<script setup lang="ts">
import ToastContainer from '~/components/ui/toast/ToastContainer.vue'
import ConfirmDialog from '~/components/ui/confirm/ConfirmDialog.vue'
import ClassManager from '~/components/class/ClassManager.vue'
import WorkspaceSwitcher from '~/components/workspace/WorkspaceSwitcher.vue'
import WorkspaceOnboarding from '~/components/workspace/WorkspaceOnboarding.vue'
import MobileDrawer from '~/components/layout/MobileDrawer.vue'
import GlobalFab from '~/components/layout/GlobalFab.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { stopSync } from '~/services/sync'
import { listLoadedWorkspaceIds } from '~/services/db'
import type { RouteLocationNormalized } from 'vue-router'

const route = useRoute()
const drawerOpen = ref(false)
const classManagerVisible = ref(false)
const classManagerRef = ref<InstanceType<typeof ClassManager> | null>(null)
const classManagerCreatedCallback = ref<((classId: string) => void) | null>(null)

provide('classManagerVisible', classManagerVisible)
provide('openClassManager', (mode: 'list' | 'create' | 'edit' = 'list', cls?: any, options?: { onCreated?: (classId: string) => void }) => {
  classManagerVisible.value = true
  classManagerCreatedCallback.value = options?.onCreated ?? null
  nextTick(() => {
    if (!classManagerRef.value) return
    if (mode === 'create') {
      classManagerRef.value.startCreate()
    } else if (mode === 'edit' && cls) {
      classManagerRef.value.editClass(cls)
    }
  })
})

function onClassCreated(classId: string) {
  classManagerCreatedCallback.value?.(classId)
  classManagerCreatedCallback.value = null
}

const workspaceStore = useWorkspaceStore()
const { currentLevel } = useRouteCache()

const pageKey = (route: RouteLocationNormalized) => {
  const level = currentLevel.value || 1
  return `${workspaceStore.currentId || 'no-workspace'}::${route.path}@L${level}`
}

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/notes': '笔记',
    '/billing': '账单',
    '/todo': '目标',
    '/time': '时间',
  }
  if (route.path.startsWith('/billing/categories/')) {
    return '分类详情'
  }
  return titles[route.path] || 'LifeOS'
})

const { isMobile } = useDevice()
const hasWorkspace = computed(() => workspaceStore.list.length > 0)
const isAuthPage = computed(() => route.path === '/login' || route.path === '/signup')


function onWorkspaceCreated() {
  // WorkspaceOnboarding 内部已调用 workspaceStore.reload() + switchTo()
}

function onBeforeUnload() {
  for (const wsId of listLoadedWorkspaceIds()) {
    stopSync(wsId)
  }
}

if (import.meta.client) {
  window.addEventListener('beforeunload', onBeforeUnload)
}

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('beforeunload', onBeforeUnload)
  }
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<style>
html, body, #__nuxt {
  height: 100%;
}
</style>

<style scoped>
.app-root {
  display: flex;
  height: 100dvh;
  overflow: hidden;
}

.app-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.app-menubar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 -1px 0 rgba(255, 255, 255, 0.3),
    0 4px 20px rgba(0, 0, 0, 0.06);
  z-index: 200;
  position: relative;
}

/* Liquid Glass refraction highlight */
.app-menubar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.menubar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.88);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content.mobile {
  overflow-y: auto;
}

/* 移动端 Header */
.mobile-header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: calc(48px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 12px 0;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset 0 -1px 0 rgba(255, 255, 255, 0.3),
    0 4px 20px rgba(0, 0, 0, 0.06);
  z-index: 200;
  position: relative;
  overflow: hidden;
}

/* Liquid Glass refraction highlight */
.mobile-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.header-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  z-index: 1;
}

.header-menu-btn:active {
  background: rgba(0, 0, 0, 0.05);
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.88);
  position: relative;
  z-index: 1;
}

.header-spacer {
  width: 36px;
}
</style>
