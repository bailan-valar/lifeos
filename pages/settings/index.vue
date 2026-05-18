<template>
  <SettingsLayout>
    <div class="settings-general">
      <h2>通用设置</h2>
      <p class="settings-desc">这里是通用设置页面</p>
    </div>
  </SettingsLayout>
</template>

<script setup lang="ts">
import SettingsLayout from '~/components/settings/SettingsLayout.vue'
</script>

<style scoped>
.settings-general h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.settings-desc {
  margin: 0;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.6);
}
</style>
