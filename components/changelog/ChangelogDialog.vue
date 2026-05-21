<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="dialog-overlay" @click.self="close">
        <Transition name="slide-up">
          <div
            v-if="isOpen"
            class="dialog-content liquid-glass-dialog"
            :class="{ 'board-mode': viewMode === 'board' }"
          >
            <div class="dialog-header">
              <div class="header-left">
                <h2 class="dialog-title">更新日志</h2>
                <div class="view-toggle">
                  <button
                    class="toggle-btn"
                    :class="{ active: viewMode === 'list' }"
                    title="列表视图"
                    @click="viewMode = 'list'"
                  >
                    <Icon name="solar:list-linear" class="toggle-icon" />
                  </button>
                  <button
                    class="toggle-btn"
                    :class="{ active: viewMode === 'board' }"
                    title="看板视图"
                    @click="viewMode = 'board'"
                  >
                    <Icon name="solar:widget-linear" class="toggle-icon" />
                  </button>
                </div>
              </div>
              <button class="close-button" @click="close">
                <Icon name="solar:close-circle-linear" class="close-icon" />
              </button>
            </div>

            <div class="dialog-body custom-scrollbar">
              <ChangelogList v-if="viewMode === 'list'" />
              <ChangelogBoard v-else />
            </div>

            <div class="dialog-footer">
              <button class="liquid-glass-button" @click="markAllRead">
                全部标记为已读
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { markAllAsRead } = useChangelog()

const VIEW_MODE_KEY = 'lifeos:changelogViewMode'

const isOpen = computed({
  get: () => useState('changelog-dialog', () => false).value,
  set: (value) => {
    useState('changelog-dialog', () => false).value = value
  }
})

const viewMode = ref<'list' | 'board'>(
  (process.client ? localStorage.getItem(VIEW_MODE_KEY) : null) as 'list' | 'board' || 'list'
)

watch(viewMode, (mode) => {
  if (process.client) {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }
})

function close() {
  isOpen.value = false
}

function markAllRead() {
  markAllAsRead()
}

defineExpose({
  close
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dialog-content.board-mode {
  max-width: 900px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--liquid-text-primary);
  letter-spacing: -0.01em;
}

.view-toggle {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--liquid-text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  color: var(--liquid-text-secondary);
}

.toggle-btn.active {
  background: rgba(255, 255, 255, 0.8);
  color: var(--liquid-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.toggle-icon {
  font-size: 16px;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--liquid-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
}

.close-icon {
  font-size: 22px;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
  padding: 16px 24px;
  min-height: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}
</style>
