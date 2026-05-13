<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="state.visible" class="confirm-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
        <div class="confirm-dialog" :class="{ mobile: isMobile }" @click.stop>
          <div class="confirm-content">
            <h3 v-if="state.title" class="confirm-title">{{ state.title }}</h3>
            <p class="confirm-message">{{ state.message }}</p>
          </div>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn cancel" @click="onCancel">
              {{ state.cancelText }}
            </button>
            <button
              type="button"
              class="confirm-btn confirm"
              :class="{ danger: state.danger }"
              @click="onConfirm"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '~/composables/useConfirm'
import { useZIndexOnOpen } from '~/composables/useZIndex'

const { state, answer } = useConfirm()
const { isMobile } = useDevice()
const overlayZIndex = useZIndexOnOpen(() => state.visible)

function onConfirm() {
  answer(true)
}

function onCancel() {
  answer(false)
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-confirm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 20px;
}
.confirm-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}
.confirm-dialog {
  min-width: 320px;
  max-width: 420px;
  width: 420px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.confirm-dialog.mobile {
  width: 100%;
  max-width: 100%;
  min-width: auto;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
  overflow: hidden;
}

.confirm-content {
  padding: 24px 24px 16px;
  flex: 1;
  overflow-y: auto;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
}

.confirm-message {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.6);
  white-space: pre-line;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 16px;
  flex-shrink: 0;
}

.confirm-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn.cancel {
  background: rgba(120, 120, 128, 0.12);
  color: rgba(0, 0, 0, 0.7);
}

.confirm-btn.cancel:hover {
  background: rgba(120, 120, 128, 0.2);
}

.confirm-btn.confirm {
  background: #007aff;
  color: #fff;
}

.confirm-btn.confirm:hover {
  background: #0051d5;
}

.confirm-btn.confirm.danger {
  background: #ff3b30;
}

.confirm-btn.confirm.danger:hover {
  background: #d70015;
}

/* Transition */
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-active .confirm-dialog,
.confirm-leave-active .confirm-dialog {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm-dialog,
.confirm-leave-to .confirm-dialog {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
</style>
