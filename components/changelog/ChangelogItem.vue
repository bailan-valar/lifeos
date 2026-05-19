<template>
  <div class="changelog-item">
    <span class="type-badge" :class="`type-${type}`">{{ typeLabel }}</span>
    <div class="item-content">
      <h4 class="item-title">{{ item.title }}</h4>
      <p v-if="item.description" class="item-description">{{ item.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Changelog } from '~/types/changelog'

const props = defineProps<{
  item: Changelog
}>()

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    feature: '新功能',
    fix: '修复',
    improvement: '改进',
    breaking: '重大变更'
  }
  return labels[props.item.type] || props.item.type
})

const type = computed(() => props.item.type)
</script>

<style scoped>
.changelog-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.changelog-item:last-child {
  border-bottom: none;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  flex-shrink: 0;
  height: fit-content;
}

.type-badge.type-feature {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.type-badge.type-fix {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.type-badge.type-improvement {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.type-badge.type-breaking {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--liquid-text-primary);
  line-height: 1.4;
}

.item-description {
  margin: 0;
  font-size: 13px;
  color: var(--liquid-text-secondary);
  line-height: 1.5;
}
</style>
