<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="dialog-overlay" @click.self="close">
        <Transition name="slide-up">
          <div v-if="isOpen" class="dialog-content liquid-glass-dialog">
            <div class="dialog-header">
              <h2 class="dialog-title">更新日志</h2>
              <button class="close-button" @click="close">
                <Icon name="solar:close-circle-linear" class="close-icon" />
              </button>
            </div>

            <div class="dialog-body custom-scrollbar">
              <ChangelogList />
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

const isOpen = computed({
  get: () => useState('changelog-dialog', () => false).value,
  set: (value) => {
    useState('changelog-dialog', () => false).value = value
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
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--liquid-text-primary);
  letter-spacing: -0.01em;
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
  overflow-y: auto;
  padding: 16px 24px;
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
