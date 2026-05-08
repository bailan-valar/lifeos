<template>
  <Teleport to="body">
    <div class="toast-container" :class="{ 'has-toasts': toasts.length > 0 }">
      <TransitionGroup name="toast-list" tag="div" class="toast-list">
        <ToastItem
          v-for="toast in toasts"
          :key="toast.id"
          :message="toast.message"
          :type="toast.type || 'info'"
          :duration="toast.duration"
          @dismiss="dismiss(toast.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import ToastItem from './ToastItem.vue'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-toast);
  display: flex;
  justify-content: center;
  padding-top: 20px;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 24px 24px;
  pointer-events: none;
}

.toast-list > * {
  pointer-events: auto;
}

/* Vue transition-group classes */
.toast-list-move {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
