<template>
  <div class="accounts-page">
    <AccountsTabPanel />
  </div>
</template>

<script setup lang="ts">
import AccountsTabPanel from '../components/panels/AccountsTabPanel.vue'
</script>

<style scoped>
.accounts-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
