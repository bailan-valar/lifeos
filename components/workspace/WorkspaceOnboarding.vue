<template>
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-header">
        <Icon name="solar:folder-2-bold-duotone" class="onboarding-icon" />
        <h2>欢迎使用 LifeOS</h2>
        <p>你还没有任何工作空间，请选择以下方式开始</p>
      </div>

      <div class="onboarding-options">
        <button class="option-card" type="button" @click="openCreate">
          <Icon name="solar:add-circle-bold-duotone" class="option-icon" />
          <div class="option-title">创建本地空间</div>
          <div class="option-desc">数据仅存储在本地设备，无需登录即可使用</div>
        </button>

        <button v-if="!authStore.user" class="option-card" type="button" @click="goLogin">
          <Icon name="solar:login-2-bold-duotone" class="option-icon" />
          <div class="option-title">登录选择空间</div>
          <div class="option-desc">登录后可同步空间列表，并启用远程同步</div>
        </button>

        <button v-else class="option-card" type="button" @click="openCreate">
          <Icon name="solar:cloud-bold-duotone" class="option-icon" />
          <div class="option-title">创建同步空间</div>
          <div class="option-desc">创建一个新的工作空间，可配置远程同步</div>
        </button>
      </div>
    </div>

    <WorkspaceFormDialog v-model:visible="formVisible" :workspace="null" @saved="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useWorkspaceStore } from '~/stores/workspace'
import WorkspaceFormDialog from './WorkspaceFormDialog.vue'

const emit = defineEmits<{
  (e: 'created'): void
}>()

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const formVisible = ref(false)

function openCreate() {
  formVisible.value = true
}

function goLogin() {
  navigateTo('/login')
}

async function onCreated() {
  await workspaceStore.reload()
  if (workspaceStore.list.length > 0 && !workspaceStore.currentId) {
    await workspaceStore.switchTo(workspaceStore.list[0].id)
  }
  emit('created')
}
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 245, 247, 0.95);
  z-index: 500;
}

.onboarding-card {
  width: 420px;
  max-width: 92vw;
  background: rgba(255, 255, 255, 0.96);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 20px;
  padding: 36px 28px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.onboarding-header {
  margin-bottom: 28px;
}

.onboarding-icon {
  font-size: 48px;
  color: rgb(0, 122, 255);
  margin-bottom: 12px;
}

.onboarding-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
  color: rgba(0, 0, 0, 0.88);
}

.onboarding-header p {
  font-size: 14px;
  color: rgba(60, 60, 67, 0.6);
  margin: 0;
}

.onboarding-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 1px solid rgba(60, 60, 67, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: center;
}

.option-card:hover {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.04);
  transform: translateY(-1px);
}

.option-icon {
  font-size: 28px;
  color: rgb(0, 122, 255);
}

.option-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.option-desc {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
  line-height: 1.4;
}
</style>
