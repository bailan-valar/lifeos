<template>
  <div class="date-filter">
    <select
      :value="year"
      class="filter-select"
      @change="$emit('year-change', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
    >
      <option :value="null">全部年份</option>
      <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
    </select>
    <select
      :value="month"
      class="filter-select"
      @change="$emit('month-change', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
    >
      <option :value="null">全部月份</option>
      <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}月</option>
    </select>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  year: number | null
  month: number | null
  yearOptions: number[]
  monthOptions: number[]
}>()

defineEmits<{
  (e: 'year-change', year: number | null): void
  (e: 'month-change', month: number | null): void
}>()
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
