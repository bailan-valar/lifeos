<template>
  <div class="module-tabs">
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTabId === tab.id, disabled: tab.disabled }"
        :disabled="tab.disabled"
        type="button"
        @click="handleTabClick(tab)"
      >
        <Icon :name="tab.icon" />
        <span>{{ tab.name }}</span>
      </button>

      <div class="tabs-spacer" />

      <button
        v-if="showModuleManager"
        class="tab-button module-manager-btn"
        type="button"
        @click="openModuleManager"
      >
        <Icon name="solar:widget-add-linear" />
        <span>添加模块</span>
      </button>
    </div>

    <div class="tabs-content">
      <component
        :is="currentComponent"
        v-if="currentComponent"
        :note-id="noteId"
        :module-data="currentModuleData"
        @data-change="handleDataChange"
      />
      <div v-else class="empty-state">
        <Icon name="solar:box-linear" size="48" />
        <p>请选择一个模块</p>
      </div>
    </div>

    <ModuleManager
      v-if="moduleManagerVisible"
      v-model:visible="moduleManagerVisible"
      :note-id="noteId"
      @module-enabled="handleModuleEnabled"
      @module-disabled="handleModuleDisabled"
    />
  </div>
</template>

<script setup lang="ts">
import type { NoteTab } from '~/types/module'
import { getModuleRegistry } from '~/services/ModuleRegistry'
import ModuleManager from '~/components/module/ModuleManager.vue'

interface Props {
  noteId: string
  showModuleManager?: boolean
}

interface Emits {
  (e: 'tab-change', tabId: string): void
  (e: 'module-enabled', moduleId: string): void
  (e: 'module-disabled', moduleId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showModuleManager: true
})
const emit = defineEmits<Emits>()

const registry = getModuleRegistry()

const tabs = ref<NoteTab[]>([])
const activeTabId = ref<string>('content')
const moduleManagerVisible = ref(false)
const currentModuleData = ref<unknown>(null)

const currentComponent = computed(() => {
  const module = registry.get(activeTabId.value)
  if (!module) return null
  return resolveComponent(module.component)
})

const loadTabs = async () => {
  const enabledModules = await registry.getEnabled(props.noteId)

  const defaultTabs: NoteTab[] = [
    {
      id: 'content',
      name: '内容',
      icon: 'solar:document-text-linear',
      order: 0,
      isDefault: true
    }
  ]

  const moduleTabs: NoteTab[] = enabledModules.map((module, index) => ({
    id: module.id,
    name: module.name,
    icon: module.icon,
    order: index + 1,
    disabled: module.status === 'error'
  }))

  tabs.value = [...defaultTabs, ...moduleTabs].sort((a, b) => a.order - b.order)

  if (!tabs.value.find((t) => t.id === activeTabId.value)) {
    activeTabId.value = tabs.value[0]?.id || 'content'
  }

  await loadModuleData()
}

const loadModuleData = async () => {
  if (activeTabId.value === 'content') {
    currentModuleData.value = null
    return
  }

  try {
    const data = await registry.getModuleData(activeTabId.value, props.noteId)
    currentModuleData.value = data
  } catch (e) {
    console.error('Failed to load module data:', e)
    currentModuleData.value = null
  }
}

const handleTabClick = async (tab: NoteTab) => {
  if (tab.disabled) return

  const oldTabId = activeTabId.value
  activeTabId.value = tab.id

  await loadModuleData()

  if (oldTabId !== tab.id) {
    emit('tab-change', tab.id)
  }
}

const handleDataChange = async (data: unknown) => {
  if (activeTabId.value === 'content') return

  try {
    await registry.saveModuleData(activeTabId.value, props.noteId, data)
    currentModuleData.value = data
  } catch (e) {
    console.error('Failed to save module data:', e)
  }
}

const openModuleManager = () => {
  moduleManagerVisible.value = true
}

const handleModuleEnabled = async (moduleId: string) => {
  await loadTabs()
  emit('module-enabled', moduleId)
}

const handleModuleDisabled = async (moduleId: string) => {
  await loadTabs()
  emit('module-disabled', moduleId)
}

watch(() => props.noteId, async () => {
  await loadTabs()
})

onMounted(async () => {
  await loadTabs()
})

defineExpose({
  refresh: loadTabs,
  switchTab: handleTabClick
})
</script>

<style scoped>
.module-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 18px;
  overflow: hidden;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 32px rgba(0, 0, 0, 0.06);
}

.tabs-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
  gap: 2px;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.tab-button:hover:not(.disabled) {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
}

.tab-button:active:not(.disabled) {
  transform: scale(0.96);
}

.tab-button.active {
  background: rgba(0, 122, 255, 0.16);
  color: rgb(0, 102, 230);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.tab-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.module-manager-btn {
  font-weight: 600;
  padding: 6px 12px;
}

.tabs-spacer {
  flex: 1;
}

.tabs-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}
</style>
