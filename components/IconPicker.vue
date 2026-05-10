<template>
  <div class="icon-picker-root">
    <label v-if="label" class="picker-label">{{ label }}</label>
    <div class="icon-picker">
      <button
        v-for="icon in icons"
        :key="icon"
        type="button"
        class="icon-option"
        :class="{ active: modelValue === icon }"
        @click="onSelect(icon)"
      >
        <Icon :name="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  icons: string[]
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
  gap: 6px;
}

.picker-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.icon-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.7);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-option:hover {
  background: rgba(0, 122, 255, 0.08);
}

.icon-option.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 102, 230);
}
</style>
