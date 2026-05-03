<template>
  <div class="app-root">
    <AppSidebar @open-settings="classManagerVisible = true" />

    <div class="app-main">
      <header class="app-menubar">
        <div class="menubar-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="menubar-right" />
      </header>
      <div class="app-content">
        <NuxtPage />
      </div>
    </div>

    <ClassManager v-model:visible="classManagerVisible" user-id="default-user" />
  </div>
</template>

<script setup lang="ts">
import ClassManager from '~/components/class/ClassManager.vue'

const route = useRoute()
const classManagerVisible = ref(false)
provide('classManagerVisible', classManagerVisible)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/notes': '笔记',
    '/billing': '账单',
    '/todo': '任务',
  }
  return titles[route.path] || 'LifeOS'
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
