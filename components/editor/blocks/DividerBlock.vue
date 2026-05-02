<template>
  <div
    class="divider-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div class="divider-line" />
  </div>
</template>

<script setup lang="ts">
import type { Block } from '~/types/block'

interface Props {
  block: Block
  isActive?: boolean
}

interface Emits {
  (e: 'focus', id: string): void
  (e: 'delete', id: string): void
}

withDefaults(defineProps<Props>(), {
  isActive: false
})

defineEmits<Emits>()
</script>

<style scoped>
.divider-block {
  position: relative;
  padding: 14px 0;
  margin: 6px 0;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.divider-block:hover {
  background-color: rgba(120, 120, 128, 0.06);
}

.divider-block.is-active {
  background-color: rgba(0, 122, 255, 0.06);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.18);
}

.divider-line {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(60, 60, 67, 0.18) 15%,
    rgba(60, 60, 67, 0.32) 50%,
    rgba(60, 60, 67, 0.18) 85%,
    transparent 100%
  );
}
</style>
