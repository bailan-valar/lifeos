<template>
  <div class="load-more-wrap">
    <button
      type="button"
      class="load-more-btn"
      :disabled="loading"
      @click="$emit('click')"
    >
      <span v-if="loading">加载中...</span>
      <span v-else>加载更多</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.load-more-btn {
  padding: 8px 24px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
