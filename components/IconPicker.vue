<template>
  <div class="icon-picker-root">
    <label v-if="label" class="picker-label">{{ label }}</label>
    <div class="icon-picker">
      <button
        v-for="icon in icons"
        :key="icon"
        type="button"
        class="icon-option liquid-glass-button"
        :class="{ active: modelValue === icon }"
        @click="onSelect(icon)"
      >
        <Icon :name="icon" size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  icons: readonly string[] | string[]
  label?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onSelect(icon: string) {
  if (props.modelValue !== icon) {
    emit('update:modelValue', icon)
  }
}
</script>

<style scoped>
.icon-picker-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--liquid-text-secondary);
  border-color: transparent;
}

.icon-option:hover {
  background: var(--liquid-bg-thick);
  color: var(--liquid-text-primary);
  border-color: rgba(59, 130, 246, 0.3);
}

.icon-option.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .icon-option.active {
    background: rgba(96, 165, 250, 0.2);
    border-color: #60a5fa;
    color: #60a5fa;
  }
}
</style>
