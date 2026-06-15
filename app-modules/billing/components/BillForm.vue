<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">所属笔记</label>
      <NotePicker
        v-model="form.noteId"
        :options="noteOptions"
        placeholder="请选择笔记"
        clearable
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">账单类型</label>
        <SelectPicker
          v-model="form.type"
          :options="typeOptions"
          placeholder="选择类型"
        />
      </div>

      <div v-if="form.type === 'income' || form.type === 'expense'" class="form-group">
        <label class="form-label">分类</label>
        <CategoryPicker
          v-model="form.categoryId"
          :categories="categories"
          :type="form.type === 'income' ? 'income' : 'expense'"
          placeholder="请选择分类"
          clearable
        />
      </div>
      <div v-else-if="form.type === 'debt'" class="form-group">
        <label class="form-label">借贷类型</label>
        <SelectPicker
          v-model="form.debtSubtype"
          :options="debtOptions"
          placeholder="选择借贷类型"
        />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">金额</label>
      <div class="amount-row">
        <AmountInput v-model="form.amount" class="amount-input" />
        <SelectPicker
          v-model="form.currency"
          :options="currencyOptions"
          placeholder="币种"
          class="currency-select"
        />
      </div>
    </div>

    <div class="account-row">
      <div class="form-group">
        <label class="form-label">出账账户</label>
        <AccountPicker
          v-model="form.fromAccountId"
          :accounts="accounts"
          placeholder="请选择出账账户"
          clearable
        />
      </div>
      <button type="button" class="swap-btn" @click="swapAccounts" title="交换账户">
        <Icon :name="ICONS.callSplit" size="18" />
      </button>
      <div class="form-group">
        <label class="form-label">入账账户</label>
        <AccountPicker
          v-model="form.toAccountId"
          :accounts="accounts"
          placeholder="请选择入账账户"
          clearable
        />
      </div>
    </div>
    <div v-if="sameAccountWarning" class="form-hint warn">出账与入账不能是同一账户</div>

    <div class="form-group">
      <label class="form-label">日期</label>
      <DateTimePicker v-model="form.date" clearable />
    </div>

    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea v-model="form.description" class="form-textarea" rows="2" placeholder="可选" />
    </div>

    <div v-if="form.type === 'expense'" class="form-group form-group-row">
      <label class="form-checkbox-label">
        <input type="checkbox" :checked="form.isSavable" @change="onSavableChange" />
        <span>可节省</span>
      </label>
      <label class="form-checkbox-label">
        <input type="checkbox" :checked="form.isReimbursable" @change="onReimbursableChange" />
        <span>可报销</span>
      </label>
    </div>
    <div v-if="form.type === 'expense' && form.isSavable" class="form-group">
      <label class="form-label">可节省金额</label>
      <AmountInput
        :model-value="form.savableAmount ?? form.amount"
        :max="form.amount"
        @update:model-value="onSavableAmountChange"
      />
    </div>
    <div v-if="form.type === 'expense' && form.isReimbursable" class="form-group">
      <label class="form-label">可报销金额</label>
      <AmountInput
        :model-value="form.reimbursableAmount ?? form.amount"
        :max="form.amount"
        @update:model-value="onReimbursableAmountChange"
      />
    </div>

    <!-- 报销单关联（仅编辑态；支出可加入/移除，报销回款收入只读展示） -->
    <div v-if="canManageReimburse" class="reimburse-section">
      <div class="reimburse-section-label">报销单</div>

      <!-- 报销回款账单（income role）只读 -->
      <div
        v-if="reimburseAssociation?.role === 'income'"
        class="reimburse-card reimburse-income-card"
      >
        <Icon :name="SOLAR_ICONS.finance.money" size="18" class="reimburse-card-icon" />
        <div class="reimburse-card-body">
          <div class="reimburse-card-head">
            <span class="reimburse-card-title">{{ reimburseAssociation.title }}</span>
            <span class="reimburse-status-badge reimburse-income">报销回款</span>
          </div>
          <div class="reimburse-card-hint">此账单为该报销单的回款收入</div>
        </div>
      </div>

      <!-- 已关联支出：展示标题 / 状态 / 回款进度 + 移除 -->
      <div v-else-if="reimburseAssociation" class="reimburse-card">
        <Icon :name="SOLAR_ICONS.finance.money" size="18" class="reimburse-card-icon" />
        <div class="reimburse-card-body">
          <div class="reimburse-card-head">
            <span class="reimburse-card-title">{{ reimburseAssociation.title }}</span>
            <span class="reimburse-status-badge" :class="reimburseAssociation.statusClass">
              {{ reimburseAssociation.statusLabel }}
            </span>
          </div>
          <div class="reimburse-card-hint">
            垫付 ¥{{ reimburseAssociation.totalExpense.toFixed(2) }}
            <template v-if="reimburseAssociation.totalIncome > 0">
              · 回款 ¥{{ reimburseAssociation.totalIncome.toFixed(2) }}
            </template>
          </div>
          <button type="button" class="reimburse-link-btn" @click="$emit('reimburse-remove')">
            从报销单移除
          </button>
        </div>
      </div>

      <!-- 未关联：加入已有 / 新建 -->
      <div v-else class="reimburse-unlinked">
        <span class="reimburse-empty">尚未归入报销单</span>
        <div class="reimburse-btn-group">
          <button type="button" class="reimburse-mini-btn" @click="$emit('reimburse-join')">
            <Icon :name="SOLAR_ICONS.action.link" size="14" />
            加入报销单
          </button>
          <button type="button" class="reimburse-mini-btn primary" @click="$emit('reimburse-create')">
            <Icon :name="SOLAR_ICONS.action.add" size="14" />
            新建报销单
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BillFormData, Account, BillCategory, BillType, DebtSubtype } from '~/types/bill'
import type { BillReimburseAssociation } from '~/types/reimbursement'
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import NotePicker from './NotePicker.vue'
import AmountInput from './AmountInput.vue'
import DateTimePicker from './DateTimePicker.vue'

const props = defineProps<{
  modelValue: BillFormData
  accounts: Account[]
  categories: BillCategory[]
  noteOptions: { id: string; title: string; level: number }[]
  /** 是否展示报销单区块（编辑态：支出 或 报销回款收入） */
  canManageReimburse?: boolean
  /** 当前账单的报销单关联视图，无关联时为 null */
  reimburseAssociation?: BillReimburseAssociation | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BillFormData): void
  (e: 'reimburse-join'): void
  (e: 'reimburse-create'): void
  (e: 'reimburse-remove'): void
}>()

const typeOptions = [
  { value: 'income' as BillType, label: '收入' },
  { value: 'expense' as BillType, label: '支出' },
  { value: 'transfer' as BillType, label: '转账' },
  { value: 'debt' as BillType, label: '债权债务' }
]

const debtOptions = [
  { value: 'lend' as DebtSubtype, label: '借出' },
  { value: 'borrow' as DebtSubtype, label: '借入' }
]

const currencyOptions = [
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const sameAccountWarning = computed(() =>
  !!form.value.fromAccountId &&
  !!form.value.toAccountId &&
  form.value.fromAccountId === form.value.toAccountId
)

function swapAccounts() {
  const from = form.value.fromAccountId
  const to = form.value.toAccountId
  form.value = {
    ...form.value,
    fromAccountId: to,
    toAccountId: from
  }
}

function onSavableChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  form.value = {
    ...form.value,
    isSavable: checked,
    savableAmount: checked ? (form.value.savableAmount || form.value.amount) : undefined
  }
}

function onSavableAmountChange(val: number) {
  form.value = { ...form.value, savableAmount: val }
}

function onReimbursableChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  form.value = {
    ...form.value,
    isReimbursable: checked,
    reimbursableAmount: checked ? (form.value.reimbursableAmount || form.value.amount) : undefined
  }
}

function onReimbursableAmountChange(val: number) {
  form.value = { ...form.value, reimbursableAmount: val }
}
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-input:focus,
.form-textarea:focus {
  border-color: rgb(0, 122, 255);
}
.amount-row {
  display: flex;
  gap: 8px;
}
.amount-input {
  flex: 1;
}
.currency-select {
  width: 90px;
  flex-shrink: 0;
}
.account-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: end;
}
.swap-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-bottom: 1px;
}
.swap-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}
.swap-btn:active {
  background: rgba(0, 122, 255, 0.12);
  transform: scale(0.95);
}
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.form-hint.warn {
  color: rgb(255, 59, 48);
}
.form-group-row {
  flex-direction: row;
  align-items: center;
}
.form-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
}
.form-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: rgb(0, 122, 255);
}

/* ========== 报销单区块 ========== */
.reimburse-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.16);
  border-radius: var(--liquid-radius-button, 14px);
  background: rgba(0, 122, 255, 0.03);
}
.reimburse-section-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}

.reimburse-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
}
.reimburse-income-card {
  background: rgba(167, 139, 250, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
}
.reimburse-card-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: rgb(99, 102, 241);
}
.reimburse-income-card .reimburse-card-icon {
  color: rgb(167, 139, 250);
}
.reimburse-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.reimburse-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.reimburse-card-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  word-break: break-all;
}
.reimburse-card-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}

.reimburse-link-btn {
  align-self: flex-start;
  margin-top: 2px;
  padding: 2px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: rgb(255, 59, 48);
  cursor: pointer;
  transition: background 0.15s ease;
}
.reimburse-link-btn:hover {
  background: rgba(255, 59, 48, 0.1);
}

.reimburse-unlinked {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reimburse-empty {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}
.reimburse-btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.reimburse-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: var(--liquid-radius-button, 14px);
  background: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
  cursor: pointer;
  transition: all 0.15s ease;
}
.reimburse-mini-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}
.reimburse-mini-btn.primary {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: rgb(99, 102, 241);
}
.reimburse-mini-btn.primary:hover {
  background: rgba(99, 102, 241, 0.18);
}

/* 报销单状态徽章 */
.reimburse-status-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}
.reimburse-status-draft {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}
.reimburse-status-submitted {
  background: rgba(96, 165, 250, 0.15);
  color: rgb(96, 165, 250);
}
.reimburse-status-approved {
  background: rgba(167, 139, 250, 0.15);
  color: rgb(167, 139, 250);
}
.reimburse-status-paid {
  background: rgba(52, 211, 153, 0.15);
  color: rgb(52, 211, 153);
}
.reimburse-status-cancelled {
  background: rgba(248, 113, 113, 0.15);
  color: rgb(248, 113, 113);
}
.reimburse-income {
  background: rgba(167, 139, 250, 0.12);
  color: rgb(167, 139, 250);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .reimburse-section {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .reimburse-card {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .reimburse-card-title {
    color: rgba(255, 255, 255, 0.92);
  }
  .reimburse-card-hint,
  .reimburse-section-label {
    color: rgba(255, 255, 255, 0.5);
  }
  .reimburse-empty {
    color: rgba(255, 255, 255, 0.45);
  }
  .reimburse-mini-btn {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
