<template>
  <div class="account-list">
    <div v-if="personal.length > 0" class="account-section">
      <div class="section-title">个人账户</div>
      <div
        v-for="account in personal"
        :key="account.id"
        class="account-item"
      >
        <div class="account-info">
          <span class="account-name">{{ account.name }}</span>
          <span class="account-badge personal">个人</span>
        </div>
        <div class="account-balance" :class="{ negative: account.balance < 0 }">
          {{ formatBalance(account.balance) }} {{ account.currency }}
        </div>
        <div class="account-actions">
          <button type="button" class="action-btn" @click="$emit('edit', account)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button type="button" class="action-btn danger" @click="$emit('delete', account.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="others.length > 0" class="account-section">
      <div class="section-title">他人账户</div>
      <div
        v-for="account in others"
        :key="account.id"
        class="account-item"
      >
        <div class="account-info">
          <span class="account-name">{{ account.name }}</span>
          <span class="account-badge other">他人</span>
        </div>
        <div class="account-balance" :class="{ negative: account.balance < 0 }">
          {{ formatBalance(account.balance) }} {{ account.currency }}
        </div>
        <div class="account-actions">
          <button type="button" class="action-btn" @click="$emit('edit', account)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button type="button" class="action-btn danger" @click="$emit('delete', account.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="personal.length === 0 && others.length === 0" class="empty">
      <Icon name="solar:wallet-linear" size="32" />
      <span>暂无账户</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Account } from '~/types/bill'

const props = defineProps<{
  accounts: Account[]
}>()

defineEmits<{
  (e: 'edit', account: Account): void
  (e: 'delete', id: string): void
}>()

const personal = computed(() => props.accounts.filter(a => a.type === 'personal'))
const others = computed(() => props.accounts.filter(a => a.type === 'other'))

function formatBalance(n: number) {
  return n.toFixed(2)
}
</script>

<style scoped>
.account-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.account-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.account-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.account-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.account-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.account-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.account-badge.personal {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.account-badge.other {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}
.account-balance {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}
.account-balance.negative {
  color: rgb(255, 59, 48);
}
.account-actions {
  display: flex;
  gap: 4px;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}
.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}
.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 14px;
}
</style>
