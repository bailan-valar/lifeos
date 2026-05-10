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
            <div v-if="pageHeaderStore.actions.length > 0" ref="moreMenuRef" class="more-menu-wrap">
              <button class="header-more-btn" type="button" @click.stop="pageHeaderStore.toggleMoreMenu()">
                <Icon name="solar:menu-dots-linear" size="18" />
              </button>
            </div>
          </div>
        </header>

        <!-- 移动端 Header -->
        <header v-if="isMobile && !isNoteDetailPage" class="mobile-header">
          <button class="header-menu-btn" type="button" @click="drawerOpen = true">
            <Icon name="solar:hamburger-menu-linear" size="22" />
          </button>
          <span class="header-title">{{ pageTitle }}</span>
          <div v-if="pageHeaderStore.actions.length > 0" ref="moreMenuRefMobile" class="header-more-wrap">
            <button class="header-more-btn" type="button" @click.stop="pageHeaderStore.toggleMoreMenu()">
              <Icon name="solar:menu-dots-linear" size="20" />
            </button>
          </div>
          <div v-else class="header-spacer" />
        </header>

        <!-- 全局更多下拉菜单（Teleport 避免被 overflow:hidden 截断） -->
        <Teleport to="body">
          <div
            v-if="pageHeaderStore.moreMenuOpen"
            class="more-dropdown"
            :style="moreDropdownStyle"
            @click.stop
          >
            <button
              v-for="(action, idx) in pageHeaderStore.actions"
              :key="idx"
              type="button"
              class="dropdown-item"
              @click.stop="pageHeaderStore.closeMoreMenu(); action.handler()"
            >
              <Icon :name="action.icon" size="14" />
              <span>{{ action.label }}</span>
            </button>
          </div>
        </Teleport>

        <div class="app-content" :class="{ 'mobile': isMobile }">
          <NuxtPage :keepalive="{ max: 10 }" :page-key="pageKey" :key="workspaceStore.currentId" />
        </div>
      </div>

      <!-- 移动端左侧抽屉 -->
      <MobileDrawer v-if="isMobile" v-model="drawerOpen" @open-settings="classManagerVisible = true" @open-workspaces="workspaceManagerVisible = true" />

      <ClassManager v-if="hasWorkspace" ref="classManagerRef" v-model:visible="classManagerVisible" @created="onClassCreated" />
    </template>

    <NuxtPage v-else class="flex-1 min-w-0" />

    <GlobalFab v-if="!isAuthPage && hasWorkspace" />

    <ToastContainer />
    <ConfirmDialog />

    <WorkspaceOnboarding v-if="!hasWorkspace && !isAuthPage" @created="onWorkspaceCreated" />

    <WorkspaceManagerDialog v-model:visible="workspaceManagerVisible" />
  </div>
</template>

<script setup lang="ts">
import ToastContainer from '~/components/ui/toast/ToastContainer.vue'
import ConfirmDialog from '~/components/ui/confirm/ConfirmDialog.vue'
import ClassManager from '~/components/class/ClassManager.vue'
import WorkspaceSwitcher from '~/components/workspace/WorkspaceSwitcher.vue'
import WorkspaceOnboarding from '~/components/workspace/WorkspaceOnboarding.vue'
import WorkspaceManagerDialog from '~/components/workspace/WorkspaceManagerDialog.vue'
import MobileDrawer from '~/components/layout/MobileDrawer.vue'
import GlobalFab from '~/components/layout/GlobalFab.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { usePageHeaderStore } from '~/stores/pageHeader'
import { stopSync } from '~/services/sync'
import { listLoadedWorkspaceIds } from '~/services/db'
import type { RouteLocationNormalized } from 'vue-router'

const route = useRoute()
const drawerOpen = ref(false)
const classManagerVisible = ref(false)
const workspaceManagerVisible = ref(false)
const classManagerRef = ref<InstanceType<typeof ClassManager> | null>(null)
const classManagerCreatedCallback = ref<((classId: string) => void) | null>(null)
const pageHeaderStore = usePageHeaderStore()
const moreMenuRef = ref<HTMLElement | null>(null)
const moreMenuRefMobile = ref<HTMLElement | null>(null)

const moreDropdownStyle = computed(() => {
  const el = moreMenuRef.value || moreMenuRefMobile.value
  if (!el) return {}
  const rect = el.getBoundingClientRect()
  return {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
    zIndex: 'var(--z-dropdown)'
  } as Record<string, string>
})

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
const isNoteDetailPage = computed(() => route.path === '/notes' && !!route.query.note)


function onWorkspaceCreated() {
  // WorkspaceOnboarding 内部已调用 workspaceStore.reload() + switchTo()
}

function onBeforeUnload() {
  for (const wsId of listLoadedWorkspaceIds()) {
    stopSync(wsId)
  }
}

function onWindowClick(e: MouseEvent) {
  if (pageHeaderStore.moreMenuOpen) {
    const desktop = moreMenuRef.value
    const mobile = moreMenuRefMobile.value
    const target = e.target as Node
    if ((desktop && !desktop.contains(target)) && (mobile && !mobile.contains(target))) {
      pageHeaderStore.closeMoreMenu()
    }
  }
}

if (import.meta.client) {
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('click', onWindowClick)
}

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('click', onWindowClick)
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

.menubar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.more-menu-wrap,
.header-more-wrap {
  position: relative;
}

.header-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-more-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.92);
}

.more-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 140px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.98);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: var(--z-dropdown);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
</style>
