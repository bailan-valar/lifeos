<template>
  <div class="app-root">
    <template v-if="!isAuthPage">
      <AppSidebar @open-settings="classManagerVisible = true" />

      <div class="app-main">
        <header class="app-menubar">
          <div class="menubar-left">
            <span class="page-title">{{ pageTitle }}</span>
          </div>
          <div class="menubar-right">
            <WorkspaceSwitcher />
          </div>
        </header>
        <div class="app-content">
          <NuxtPage :key="workspaceStore.currentId || 'no-workspace'" />
        </div>
      </div>

      <ClassManager v-if="hasWorkspace" ref="classManagerRef" v-model:visible="classManagerVisible" user-id="default-user" @created="onClassCreated" />
    </template>

    <NuxtPage v-else class="flex-1 min-w-0" />

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
import { useWorkspaceStore } from '~/stores/workspace'

const route = useRoute()
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

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/notes': '笔记',
    '/billing': '账单',
    '/todo': '目标',
  }
  if (route.path.startsWith('/billing/categories/')) {
    return '分类详情'
  }
  return titles[route.path] || 'LifeOS'
})

const hasWorkspace = computed(() => workspaceStore.list.length > 0)
const isAuthPage = computed(() => route.path === '/login' || route.path === '/signup')

function onWorkspaceCreated() {
  // WorkspaceOnboarding 内部已调用 workspaceStore.reload() + switchTo()
}

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
  height: 100vh;
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
  background: rgba(255, 255, 255, 0.45);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.3);
  z-index: 200;
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
</style>
