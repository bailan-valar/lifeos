<template>
  <div class="skeleton-wrap">
    <div v-for="i in 5" :key="i" class="skeleton-row" />
  </div>
</template>

<style scoped>
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.skeleton-row {
  height: 56px;
  background: linear-gradient(90deg, rgba(60, 60, 67, 0.06) 25%, rgba(60, 60, 67, 0.1) 50%, rgba(60, 60, 67, 0.06) 75%);
  background-size: 200% 100%;
  border-radius: 10px;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
