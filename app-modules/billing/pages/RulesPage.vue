<template>
  <div class="rules-page">
    <RulesTabPanel :import-rules="importRules" />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import type { ImportRule } from '~/types/bill'
import RulesTabPanel from '../components/panels/RulesTabPanel.vue'

// 注入规则数据
const importRules = inject<Ref<ImportRule[]>>('importRules')
</script>

<style scoped>
.rules-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
