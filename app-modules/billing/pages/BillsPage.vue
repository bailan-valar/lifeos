<template>
  <div class="bills-page">
    <BillsTabPanel />
  </div>
</template>

<script setup lang="ts">
import BillsTabPanel from '../components/panels/BillsTabPanel.vue'
</script>

<style scoped>
.bills-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
