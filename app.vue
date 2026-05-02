<template>
  <div class="app-root">
    <header class="app-menubar">
      <div class="menubar-left">
        <div class="app-logo">
          <Icon name="solar:notes-linear" class="logo-icon" />
          <span class="app-name">LifeOS</span>
        </div>
      </div>
      <div class="menubar-right">
        <button class="menubar-btn" type="button" title="设置" @click="classManagerVisible = true">
          <Icon name="solar:settings-linear" />
        </button>
      </div>
    </header>
    <div class="app-content">
      <NuxtPage />
    </div>

    <ClassManager v-model:visible="classManagerVisible" user-id="default-user" />
  </div>
</template>

<script setup lang="ts">
import ClassManager from '~/components/class/ClassManager.vue'

const classManagerVisible = ref(false)
provide('classManagerVisible', classManagerVisible)

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
  flex-direction: column;
  height: 100vh;
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

.menubar-left,
.menubar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 20px;
  color: rgba(0, 0, 0, 0.85);
}

.app-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.88);
}

.menubar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.7);
  font-size: 18px;
  cursor: pointer;
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  transition: background 0.15s ease, color 0.15s ease;
}

.menubar-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  color: rgba(60, 60, 67, 0.9);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
