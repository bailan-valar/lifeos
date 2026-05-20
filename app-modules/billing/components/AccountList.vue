<template>
  <div class="account-list">
    <div v-for="group in groups" :key="group.key" v-show="group.items.length > 0" class="account-section">
      <div class="section-title">{{ group.label }}</div>
      <div
        v-for="account in group.items"
        :key="account.id"
        class="account-item"
        :class="{ 'credit-item': isCreditCard(account) }"
      >
        <!-- 信用卡专用布局 -->
        <template v-if="isCreditCard(account)">
          <div class="credit-row-top">
            <div class="account-info">
              <span class="account-name" @click="$emit('view-detail', account)">{{ account.name }}</span>
              <span class="account-badge" :class="badgeClass(account)">{{ badgeLabel(account) }}</span>
            </div>
            <div class="credit-balance-group">
              <div class="account-balance" :class="{ negative: account.balance < 0 }">
                {{ formatBalance(account.balance) }} {{ account.currency }}
              </div>
              <div
                class="remaining-limit"
                :class="{ warning: (account.creditLimit ?? 0) + account.balance < (account.creditLimit ?? 0) * 0.2 }"
              >
                剩余 {{ formatBalance(Math.max(0, (account.creditLimit ?? 0) + account.balance)) }}
              </div>
            </div>
          </div>
          <div class="credit-row-bottom">
            <div class="credit-meta">
              <span class="credit-chip">额度 {{ formatBalance(account.creditLimit ?? 0) }}</span>
              <span class="credit-chip">还剩 {{ repaymentDays(account) }} 天</span>
              <span class="credit-chip" :class="{ negative: account.balance < 0 }">
                待还 {{ formatBalance(Math.max(0, -account.balance)) }}
              </span>
            </div>
            <div class="account-actions">
              <button
                type="button"
                class="action-btn"
                title="查看账单周期"
                @click="$emit('view-statements', account)"
              >
                <Icon name="solar:calendar-linear" size="14" />
              </button>
              <button type="button" class="action-btn" title="调整余额" @click="$emit('adjust-balance', account)">
                <Icon name="solar:wallet-money-linear" size="14" />
              </button>
              <button type="button" class="action-btn" @click="$emit('edit', account)">
                <Icon name="solar:pen-linear" size="14" />
              </button>
              <button type="button" class="action-btn danger" @click="$emit('delete', account.id)">
                <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
              </button>
            </div>
          </div>
        </template>

        <!-- 非信用卡保持原布局 -->
        <template v-else>
          <div class="account-row">
            <div class="account-info">
              <span class="account-name" @click="$emit('view-detail', account)">{{ account.name }}</span>
              <span class="account-badge" :class="badgeClass(account)">{{ badgeLabel(account) }}</span>
            </div>
            <div class="account-balance" :class="{ negative: account.balance < 0 }">
              {{ formatBalance(account.balance) }} {{ account.currency }}
            </div>
            <div class="account-actions">
              <button type="button" class="action-btn" title="调整余额" @click="$emit('adjust-balance', account)">
                <Icon name="solar:wallet-money-linear" size="14" />
              </button>
              <button type="button" class="action-btn" @click="$emit('edit', account)">
                <Icon name="solar:pen-linear" size="14" />
              </button>
              <button type="button" class="action-btn danger" @click="$emit('delete', account.id)">
                <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="accounts.length === 0" class="empty">
      <Icon name="solar:wallet-linear" size="32" />
      <span>暂无账户</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Account, AccountSubtype } from '~/types/bill'

const props = defineProps<{
  accounts: Account[]
}>()

defineEmits<{
  (e: 'edit', account: Account): void
  (e: 'delete', id: string): void
  (e: 'view-statements', account: Account): void
  (e: 'adjust-balance', account: Account): void
  (e: 'view-detail', account: Account): void
}>()

interface AccountGroup {
  key: string
  label: string
  items: Account[]
}

function effectiveSubtype(a: Account): AccountSubtype | null {
  if (a.type !== 'personal') return null
  return (a.subtype || 'cash') as AccountSubtype
}

const groups = computed<AccountGroup[]>(() => {
  const cash: Account[] = []
  const debit: Account[] = []
  const credit: Account[] = []
  const online: Account[] = []
  const merchants: Account[] = []
  const contacts: Account[] = []
  const others: Account[] = []

  for (const a of props.accounts) {
    if (a.type === 'merchant') {
      merchants.push(a)
      continue
    }
    if (a.type === 'contact') {
      contacts.push(a)
      continue
    }
    if (a.type === 'other') {
      others.push(a)
      continue
    }
    const sub = effectiveSubtype(a)
    if (sub === 'debit_card') debit.push(a)
    else if (sub === 'credit_card') credit.push(a)
    else if (sub === 'online_account') online.push(a)
    else cash.push(a)
  }

  return [
    { key: 'cash', label: '现金', items: cash },
    { key: 'debit_card', label: '储蓄卡', items: debit },
    { key: 'credit_card', label: '信用卡', items: credit },
    { key: 'online_account', label: '网络账户', items: online },
    { key: 'merchant', label: '商户', items: merchants },
    { key: 'contact', label: '联系人', items: contacts },
    { key: 'other', label: '其他', items: others }
  ]
})

function isCreditCard(a: Account): boolean {
  return a.type === 'personal' && a.subtype === 'credit_card'
}

function badgeLabel(a: Account): string {
  if (a.type === 'merchant') return '商户'
  if (a.type === 'contact') return '联系人'
  if (a.type === 'other') return '其他'
  const sub = effectiveSubtype(a)
  if (sub === 'debit_card') return '储蓄卡'
  if (sub === 'credit_card') return '信用卡'
  if (sub === 'online_account') return '网络'
  return '现金'
}

function badgeClass(a: Account): string {
  if (a.type === 'merchant') return 'merchant'
  if (a.type === 'contact') return 'contact'
  if (a.type === 'other') return 'other'
  const sub = effectiveSubtype(a)
  if (sub === 'credit_card') return 'credit'
  if (sub === 'debit_card') return 'debit'
  if (sub === 'online_account') return 'online'
  return 'personal'
}

function repaymentDays(a: Account): number {
  if (!a.repaymentDay) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentDay = today.getDate()
  let targetMonth = today.getMonth()
  let targetYear = today.getFullYear()

  if (currentDay >= a.repaymentDay) {
    targetMonth++
    if (targetMonth > 11) {
      targetMonth = 0
      targetYear++
    }
  }

  const targetDate = new Date(targetYear, targetMonth, a.repaymentDay)
  targetDate.setHours(0, 0, 0, 0)
  const diffMs = targetDate.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

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
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
}
.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
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
  cursor: pointer;
  transition: color 0.15s ease;
}
.account-name:hover {
  color: rgb(0, 122, 255);
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
.account-badge.debit {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.account-badge.credit {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.account-badge.online {
  background: rgba(90, 200, 250, 0.12);
  color: rgb(0, 122, 255);
}
.account-badge.merchant {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}
.account-badge.contact {
  background: rgba(88, 86, 214, 0.1);
  color: rgb(88, 86, 214);
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
.credit-item {
  gap: 10px;
}
.credit-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.credit-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.credit-balance-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.remaining-limit {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.6);
}
.remaining-limit.warning {
  color: rgb(255, 149, 0);
}
.credit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.credit-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.78);
}
.credit-chip.negative {
  background: rgba(255, 59, 48, 0.1);
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
