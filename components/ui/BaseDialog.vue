<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="visible"
        class="dialog-overlay"
        :class="{ mobile: isMobile }"
        :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined"
        @click="onOverlayClick"
      >
        <div
          class="dialog"
          :class="{ mobile: isMobile, [sizeClass]: true }"
          tabindex="-1"
          @click.stop
          @keydown="onKeyDown"
        >
          <div v-if="$slots.header || title" class="dialog-header">
            <slot name="header">
              <h3 class="dialog-title">{{ title }}</h3>
            </slot>
            <button
              v-if="showClose"
              type="button"
              class="dialog-close"
              @click="onClose"
            >
              <Icon name="solar:close-circle-linear" :size="closeIconSize" />
            </button>
          </div>

          <div class="dialog-body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="dialog-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useZIndexOnOpen } from '~/composables/useZIndex'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    size?: 'small' | 'medium' | 'large'
    showClose?: boolean
    closeOnOverlay?: boolean
    closeOnEsc?: boolean
    closeIconSize?: string | number
  }>(),
  {
    size: 'medium',
    showClose: true,
    closeOnOverlay: true,
    closeOnEsc: true,
    closeIconSize: 20,
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const { isMobile } = useDevice()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const sizeClass = computed(() => `dialog-${props.size}`)

function onClose() {
  emit('update:visible', false)
  emit('close')
}

function onOverlayClick() {
  if (props.closeOnOverlay) {
    onClose()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (props.closeOnEsc && e.key === 'Escape') {
    onClose()
  }
}

// 暴露方法供外部调用
defineExpose({
  close: onClose,
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dialog-overlay-bg, rgba(0, 0, 0, 0.25));
  backdrop-filter: blur(var(--dialog-overlay-blur, 8px));
  padding: var(--dialog-overlay-padding, 20px);
}

.dialog-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: var(--dialog-overlay-bg-mobile, rgba(0, 0, 0, 0.35));
}

.dialog {
  max-width: 100%;
  max-height: var(--dialog-max-height, 85vh);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--liquid-radius);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.dialog.mobile {
  width: 100%;
  max-height: var(--dialog-max-height-mobile, 90vh);
  border-radius: var(--liquid-radius) var(--liquid-radius) 0 0;
  border-bottom: none;
}

.dialog-small {
  width: var(--dialog-width-small, 400px);
}

.dialog-medium {
  width: var(--dialog-width-medium, 520px);
}

.dialog-large {
  width: var(--dialog-width-large, 680px);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--dialog-header-padding, 16px 20px);
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: var(--dialog-title-font-size, 17px);
  font-weight: var(--dialog-title-font-weight, 700);
  color: var(--dialog-title-color, rgba(0, 0, 0, 0.92));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dialog-close-color, rgba(60, 60, 67, 0.45));
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.dialog-close:hover {
  background: var(--dialog-close-hover-bg, rgba(0, 0, 0, 0.05));
  color: var(--dialog-close-hover-color, rgba(60, 60, 67, 0.85));
}

.dialog-body {
  padding: var(--dialog-body-padding, 20px);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.dialog-footer {
  display: flex;
  gap: var(--dialog-footer-gap, 10px);
  justify-content: var(--dialog-footer-justify, flex-end);
  padding: var(--dialog-footer-padding, 16px 20px);
  border-top: var(--dialog-footer-border, 0.5px solid rgba(60, 60, 67, 0.12));
  flex-shrink: 0;
}

/* Scrollbar */
.dialog-body::-webkit-scrollbar {
  width: 5px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: var(--dialog-scrollbar-thumb, rgba(0, 0, 0, 0.12));
  border-radius: 10px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: var(--dialog-scrollbar-thumb-hover, rgba(0, 0, 0, 0.22));
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}

.dialog-enter-from.mobile .dialog,
.dialog-leave-to.mobile .dialog {
  transform: translateY(100%);
}
</style>
