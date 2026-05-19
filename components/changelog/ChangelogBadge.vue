<template>
  <button
    class="changelog-badge"
    :class="{ 'has-unread': unreadCount > 0 }"
    :title="unreadCount > 0 ? '有新版本更新' : '更新日志'"
    @click="openDialog"
  >
    <Icon name="solar:document-text-linear" class="badge-icon" />
    <span v-if="unreadCount > 0" class="badge-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
  </button>
</template>

<script setup lang="ts">
const { unreadCount, markAllAsRead } = useChangelog()

// Nuxt 会自动获取组件
const dialog = useState('changelog-dialog', () => false)

function openDialog() {
  dialog.value = true
}

defineExpose({
  openDialog
})
</script>

<style scoped>
.changelog-badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  cursor: pointer;
  transition: all 0.15s ease;
}

.changelog-badge:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.changelog-badge.has-unread {
  color: rgb(0, 122, 255);
}

.badge-icon {
  font-size: 20px;
}

.badge-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: rgb(255, 59, 48);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid white;
}
</style>
