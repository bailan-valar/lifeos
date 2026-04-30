<template>
  <div
    class="divider-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div class="divider-line"></div>
    <div class="block-handle" v-if="isActive">
      <slot name="handle" />
    </div>
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
  padding: 16px 0;
  margin: 8px 0;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
}

.divider-block:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.divider-block.is-active {
  background-color: rgba(0, 122, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.divider-line {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.2) 20%,
    rgba(0, 0, 0, 0.2) 80%,
    transparent 100%
  );
}

.block-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.divider-block:hover .block-handle {
  opacity: 1;
}
</style>
