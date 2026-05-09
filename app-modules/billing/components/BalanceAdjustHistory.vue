<template>
  <div class="history-list">
    <div v-if="adjustments.length === 0" class="empty">
      <Icon name="solar:history-linear" size="24" />
      <span>暂无余额调整记录</span>
    </div>
    <div v-for="item in adjustments" :key="item.id" class="history-item">
      <div class="history-main">
        <div class="history-date">{{ formatDate(item.date) }}</div>
        <div class="history-change">
          <span class="before">{{ formatBalance(item.balanceBefore) }}</span>
          <Icon name="solar:arrow-right-linear" size="12" class="arrow" />
          <span class="after">{{ formatBalance(item.balanceAfter) }}</span>
        </div>
      </div>
      <div v-if="item.note" class="history-note">{{ item.note }}</div>
      <button type="button" class="delete-btn" title="删除记录" @click="$emit('delete', item.id)">
        <Icon name="solar:trash-bin-minimalistic-linear" size="12" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BalanceAdjustment } from '~/types/bill'

defineProps<{
  adjustments: BalanceAdjustment[]
}>()

defineEmits<{
  delete: [id: string]
}>()

function formatDate(date: string) {
  return date.replace('T', ' ').slice(0, 16)
}

function formatBalance(n: number) {
  return n.toFixed(2)
}
</script>

<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 13px;
}
.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 8px;
  position: relative;
}
.history-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.history-date {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  font-feature-settings: 'tnum';
}
.history-change {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  font-feature-settings: 'tnum';
}
.before {
  color: rgba(60, 60, 67, 0.6);
}
.arrow {
  color: rgba(60, 60, 67, 0.4);
}
.after {
  color: rgb(0, 122, 255);
}
.history-note {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}
.history-item:hover .delete-btn {
  opacity: 1;
}
.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
</style>
