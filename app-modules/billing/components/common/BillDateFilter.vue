<template>
  <div class="date-filter">
    <select
      v-model="yearModel"
      class="filter-select"
    >
      <option :value="null">全部年份</option>
      <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
    </select>
    <select
      v-model="monthModel"
      class="filter-select"
    >
      <option :value="null">全部月份</option>
      <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}月</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { storeToRefs } from 'pinia'

const store = useBillingStore()
const { billYearFilter, billMonthFilter, billYearOptions } = storeToRefs(store)

const yearOptions = computed(() => billYearOptions.value)
const monthOptions = store.billMonthOptions

const yearModel = computed({
  get: () => billYearFilter.value,
  set: (v) => { billYearFilter.value = v }
})

const monthModel = computed({
  get: () => billMonthFilter.value,
  set: (v) => { billMonthFilter.value = v }
})
</script>

<style scoped>
.date-filter {
  display: flex;
  gap: 6px;
  align-items: center;
}

.filter-select {
  padding: 6px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  cursor: pointer;
}
</style>
