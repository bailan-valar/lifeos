<template>
  <div v-if="visible" class="shortcut-hint">
    <div class="hint-content">
      <Icon name="solar:keyboard-linear" size="16" />
      <span class="hint-text">按 <kbd>{{ isMac ? '⌘' : 'Ctrl' }}</kbd> + <kbd>G</kbd> 快速记录进度</span>
      <button @click="dismiss" class="dismiss-btn" type="button">
        <Icon name="solar:close-circle-linear" size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible?: boolean
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const isMac = computed(() => {
  if (import.meta.client) {
    return /Mac|iP(hone|[oa]d)/.test(navigator.platform)
  }
  return false
})

function dismiss() {
  emit('dismiss')
}
</script>

<style scoped>
.shortcut-hint {
  padding: 12px 16px;
  background: rgba(0, 122, 255, 0.08);
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  border-radius: 10px;
  margin-bottom: 16px;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(0, 102, 230);
  font-size: 13px;
}

.hint-text {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.8);
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dismiss-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgb(0, 102, 230);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  padding: 0;
}

.dismiss-btn:hover {
  opacity: 1;
}

@media (max-width: 640px) {
  .shortcut-hint {
    padding: 10px 12px;
  }

  .hint-content {
    font-size: 12px;
  }
}
</style>
