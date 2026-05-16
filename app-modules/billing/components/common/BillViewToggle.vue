<template>
  <div class="view-toggle">
    <button
      type="button"
      class="toggle-btn"
      :class="{ active: mode === 'card' }"
      @click="$emit('mode-change', 'card')"
    >
      <Icon name="solar:widget-2-linear" size="16" />
    </button>
    <button
      type="button"
      class="toggle-btn"
      :class="{ active: mode === 'table' }"
      @click="$emit('mode-change', 'table')"
    >
      <Icon name="solar:clipboard-list-linear" size="16" />
    </button>
    <button
      type="button"
      class="toggle-btn"
      :class="{ active: mode === 'calendar' }"
      @click="$emit('mode-change', 'calendar')"
    >
      <Icon name="solar:calendar-linear" size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mode: 'card' | 'table' | 'calendar'
}>()

defineEmits<{
  (e: 'mode-change', mode: 'card' | 'table' | 'calendar'): void
}>()
</script>

<style scoped>
.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
