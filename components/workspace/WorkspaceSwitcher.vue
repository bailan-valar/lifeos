<template>
  <div class="ws-switcher" v-click-outside="closeMenu">
    <button
      class="ws-trigger"
      type="button"
      :disabled="ws.switching.value"
      @click="toggleMenu"
    >
      <Icon name="solar:folder-2-linear" class="ws-trigger-icon" />
      <span class="ws-trigger-name">{{ ws.current.value?.name || '未选择空间' }}</span>
      <SyncStatusBadge :status="status" />
      <Icon
        name="solar:alt-arrow-down-linear"
        class="ws-trigger-caret"
        :class="{ open: menuOpen }"
      />
    </button>

    <Transition name="ws-menu">
      <div v-if="menuOpen" class="ws-menu" @click.stop>
        <div v-if="ws.list.value.length === 0" class="ws-menu-empty">
          还没有任何空间
        </div>
        <button
          v-for="item in ws.list.value"
          :key="item.id"
          class="ws-menu-item"
          :class="{ current: item.id === ws.currentId.value }"
          type="button"
          :disabled="ws.switching.value"
          @click="onSwitch(item.id)"
        >
          <Icon
            :name="item.id === ws.currentId.value ? 'solar:check-circle-bold' : 'solar:folder-2-linear'"
            class="ws-menu-item-icon"
          />
          <span class="ws-menu-item-name">{{ item.name }}</span>
          <SyncStatusBadge
            v-if="item.id === ws.currentId.value"
            :status="status"
          />
        </button>

        <div class="ws-menu-divider" />

        <button class="ws-menu-action" type="button" @click="openCreate">
          <Icon name="solar:add-circle-linear" />
          <span>新建空间</span>
        </button>
        <button class="ws-menu-action" type="button" @click="openManager">
          <Icon name="solar:settings-linear" />
          <span>管理空间</span>
        </button>
      </div>
    </Transition>

    <WorkspaceManagerDialog v-model:visible="managerVisible" />
    <WorkspaceFormDialog v-model:visible="formVisible" :workspace="null" />
  </div>
</template>

<script setup lang="ts">
import { ref, type Directive } from 'vue'
import { useWorkspaces } from '~/composables/useWorkspaces'
import { useSyncStatus } from '~/composables/useSyncStatus'
import { useToast } from '~/composables/useToast'
import SyncStatusBadge from './SyncStatusBadge.vue'
import WorkspaceManagerDialog from './WorkspaceManagerDialog.vue'
import WorkspaceFormDialog from './WorkspaceFormDialog.vue'

const ws = useWorkspaces()
const { status } = useSyncStatus()
const toast = useToast()

const menuOpen = ref(false)
const managerVisible = ref(false)
const formVisible = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

async function onSwitch(id: string) {
  if (id === ws.currentId.value) {
    closeMenu()
    return
  }
  closeMenu()
  try {
    await ws.switchTo(id)
    toast.success('已切换工作空间')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '切换失败')
  }
}

function openCreate() {
  closeMenu()
  formVisible.value = true
}

function openManager() {
  closeMenu()
  managerVisible.value = true
}

const vClickOutside: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) {
        binding.value?.()
      }
    }
    ;(el as any).__clickOutside = handler
    document.addEventListener('mousedown', handler)
  },
  unmounted(el) {
    const handler = (el as any).__clickOutside
    if (handler) {
      document.removeEventListener('mousedown', handler)
      delete (el as any).__clickOutside
    }
  }
}
</script>

<style scoped>
.ws-switcher {
  position: relative;
  display: inline-block;
}

.ws-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.6);
  color: rgba(0, 0, 0, 0.85);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  max-width: 240px;
}

.ws-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(60, 60, 67, 0.2);
}

.ws-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ws-trigger-icon {
  font-size: 14px;
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}

.ws-trigger-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-trigger-caret {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  transition: transform 0.18s ease;
}

.ws-trigger-caret.open {
  transform: rotate(180deg);
}

.ws-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 260px;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.96);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
  padding: 6px;
  z-index: 250;
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
}

.ws-menu-empty {
  padding: 14px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
  text-align: center;
}

.ws-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}

.ws-menu-item:hover:not(:disabled) {
  background: rgba(120, 120, 128, 0.08);
}

.ws-menu-item.current {
  color: rgb(0, 122, 255);
  font-weight: 600;
}

.ws-menu-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ws-menu-item-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.ws-menu-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-menu-divider {
  height: 1px;
  background: rgba(60, 60, 67, 0.1);
  margin: 6px 4px;
}

.ws-menu-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.85);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}

.ws-menu-action:hover {
  background: rgba(120, 120, 128, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.ws-menu-enter-active, .ws-menu-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.ws-menu-enter-from, .ws-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
