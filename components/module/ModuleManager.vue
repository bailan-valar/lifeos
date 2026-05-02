<template>
  <div v-if="visible" class="module-manager-overlay" @click="handleOverlayClick">
    <div class="module-manager" @click.stop>
      <div class="manager-header">
        <h2>模块管理</h2>
        <button class="close-btn" type="button" @click="close">
          <Icon name="solar:close-circle-linear" size="20" />
        </button>
      </div>

      <div class="manager-content">
        <div class="module-list">
          <div
            v-for="module in availableModules"
            :key="module.id"
            class="module-item"
            :class="{ enabled: isEnabled(module.id), loading: loadingModules.has(module.id) }"
          >
            <div class="module-info">
              <div class="module-icon">
                <Icon :name="module.icon" size="24" />
              </div>
              <div class="module-details">
                <div class="module-name">{{ module.name }}</div>
                <div class="module-description">{{ module.description || '暂无描述' }}</div>
                <div class="module-meta">
                  <span class="module-version">v{{ module.version }}</span>
                  <span v-if="module.error" class="module-error">{{ module.error }}</span>
                </div>
              </div>
            </div>

            <div class="module-actions">
              <button
                v-if="!isEnabled(module.id)"
                class="action-btn enable-btn"
                :disabled="loadingModules.has(module.id)"
                type="button"
                @click="handleEnable(module)"
              >
                {{ loadingModules.has(module.id) ? '启用中...' : '启用' }}
              </button>
              <button
                v-else
                class="action-btn disable-btn"
                :disabled="loadingModules.has(module.id) || module.isDefault"
                type="button"
                @click="handleDisable(module)"
              >
                {{ loadingModules.has(module.id) ? '禁用中...' : '禁用' }}
              </button>
            </div>
          </div>

          <div v-if="availableModules.length === 0" class="empty-state">
            <Icon name="solar:box-linear" size="48" />
            <p>暂无可用模块</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Module } from '~/types/module'
import { getModuleRegistry } from '~/services/ModuleRegistry'

interface Props {
  visible: boolean
  noteId: string
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'module-enabled', moduleId: string): void
  (e: 'module-disabled', moduleId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const registry = getModuleRegistry()

const availableModules = ref<Module[]>([])
const enabledModuleIds = ref<Set<string>>(new Set())
const loadingModules = ref<Set<string>>(new Set())

const loadModules = async () => {
  const allModules = registry.getAll()
  const enabledModules = await registry.getEnabled(props.noteId)

  availableModules.value = allModules
    .filter((m) => m.id !== 'content')
    .sort((a, b) => a.name.localeCompare(b.name))

  enabledModuleIds.value = new Set(enabledModules.map((m) => m.id))
}

const isEnabled = (moduleId: string) => {
  return enabledModuleIds.value.has(moduleId)
}

const handleEnable = async (module: Module) => {
  if (loadingModules.value.has(module.id)) return

  loadingModules.value.add(module.id)

  try {
    await registry.enable(module.id, props.noteId)
    enabledModuleIds.value.add(module.id)
    emit('module-enabled', module.id)
  } catch (e) {
    console.error(`Failed to enable module ${module.id}:`, e)
  } finally {
    loadingModules.value.delete(module.id)
  }
}

const handleDisable = async (module: Module) => {
  if (loadingModules.value.has(module.id) || module.isDefault) return

  loadingModules.value.add(module.id)

  try {
    await registry.disable(module.id, props.noteId)
    enabledModuleIds.value.delete(module.id)
    emit('module-disabled', module.id)
  } catch (e) {
    console.error(`Failed to disable module ${module.id}:`, e)
  } finally {
    loadingModules.value.delete(module.id)
  }
}

const close = () => {
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  close()
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    await loadModules()
  }
})

watch(() => props.noteId, async () => {
  if (props.visible) {
    await loadModules()
  }
})
</script>

<style scoped>
.module-manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.module-manager {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 20px;
  overflow: hidden;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.manager-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  letter-spacing: -0.02em;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.manager-content {
  padding: 8px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 12px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.module-item:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(60, 60, 67, 0.18);
}

.module-item.enabled {
  border-color: rgba(0, 122, 255, 0.3);
  background: rgba(0, 122, 255, 0.04);
}

.module-item.loading {
  opacity: 0.6;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 12px;
  color: rgb(0, 102, 230);
  flex-shrink: 0;
}

.module-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.module-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  letter-spacing: -0.01em;
}

.module-description {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
  line-height: 1.4;
}

.module-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.module-version {
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.5);
  padding: 2px 6px;
  background: rgba(60, 60, 67, 0.08);
  border-radius: 4px;
}

.module-error {
  font-size: 11px;
  font-weight: 500;
  color: rgb(255, 59, 48);
  padding: 2px 6px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 4px;
}

.module-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.enable-btn {
  background: rgb(0, 122, 255);
  color: white;
}

.enable-btn:hover:not(:disabled) {
  background: rgb(0, 110, 250);
}

.enable-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.disable-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}

.disable-btn:hover:not(:disabled) {
  background: rgba(60, 60, 67, 0.16);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}
</style>
