<template>
  <div
    class="toast-item"
    :class="[`type-${type}`, { 'leaving': isLeaving }]"
    @mouseenter="pause"
    @mouseleave="resume"
  >
    <div class="toast-glow" />
    <div class="toast-inner">
      <div class="toast-icon">
        <Icon :name="iconName" size="20" />
      </div>
      <span class="toast-text">{{ message }}</span>
      <button class="toast-close" @click="startDismiss">
        <Icon name="solar:close-circle-linear" size="16" />
      </button>
    </div>
    <div
      v-if="duration && duration > 0"
      class="toast-progress"
      :style="{ transform: `scaleX(${progress})` }"
    />
  </div>
</template>

<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const props = defineProps<{
  message: string
  type: ToastType
  duration?: number
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const isLeaving = ref(false)
const isPaused = ref(false)
const progress = ref(1)

const totalDuration = props.duration ?? 3000
let remaining = totalDuration
let lastTime = 0
let rafId = 0

const iconMap: Record<ToastType, string> = {
  success: 'solar:check-circle-bold-duotone',
  error: 'solar:close-circle-bold-duotone',
  warning: 'solar:danger-circle-bold-duotone',
  info: 'solar:info-circle-bold-duotone',
}

const iconName = computed(() => iconMap[props.type])

const typeColor: Record<ToastType, string> = {
  success: 'rgb(52, 199, 89)',
  error: 'rgb(255, 59, 48)',
  warning: 'rgb(255, 149, 0)',
  info: 'rgb(0, 122, 255)',
}

const color = computed(() => typeColor[props.type])

function tick(timestamp: number) {
  if (isPaused.value || isLeaving.value) {
    lastTime = timestamp
    rafId = requestAnimationFrame(tick)
    return
  }
  if (!lastTime) lastTime = timestamp
  const delta = timestamp - lastTime
  lastTime = timestamp
  remaining = Math.max(0, remaining - delta)
  progress.value = totalDuration > 0 ? remaining / totalDuration : 0
  if (remaining <= 0) {
    startDismiss()
    return
  }
  rafId = requestAnimationFrame(tick)
}

function pause() {
  isPaused.value = true
}

function resume() {
  isPaused.value = false
  lastTime = 0
}

function startDismiss() {
  if (isLeaving.value) return
  isLeaving.value = true
  cancelAnimationFrame(rafId)
  setTimeout(() => emit('dismiss'), 200)
}

onMounted(() => {
  if (totalDuration > 0) {
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.toast-item {
  position: relative;
  width: 360px;
  max-width: min(480px, calc(100vw - 48px));
  padding: 1.5px;
  border-radius: 14px;
  overflow: hidden;
  animation: toastIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.toast-item.leaving {
  animation: toastOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}

.toast-item:hover {
  transform: translateY(-1px);
}

/* Liquid glass outer edge */
.toast-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  padding: 1.5px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.75) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}

/* Liquid glass refraction glow */
.toast-glow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: v-bind(color);
  opacity: 0.14;
  filter: blur(20px);
  transform: scale(1.08);
  z-index: 0;
  pointer-events: none;
}

.toast-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 10px;
  border-radius: 13px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.78) 0%,
    rgba(255, 255, 255, 0.58) 100%
  );
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  backdrop-filter: blur(40px) saturate(200%);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.85),
    inset 0 -1px 1px rgba(255, 255, 255, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.05);
  z-index: 1;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: v-bind(color);
  filter: drop-shadow(0 0 8px v-bind(color));
}

.toast-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: rgba(0, 0, 0, 0.88);
  letter-spacing: -0.01em;
  word-break: break-word;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(60, 60, 67, 0.8);
}

.toast-progress {
  position: absolute;
  bottom: 3px;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: v-bind(color);
  opacity: 0.45;
  transform-origin: left;
  transition: none;
  z-index: 3;
  pointer-events: none;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
  }
}
</style>
