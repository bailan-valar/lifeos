<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">账单类型</label>
      <div class="type-grid">
        <button
          v-for="t in typeOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.type === t.value }"
          @click="form.type = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">标题</label>
      <input v-model="form.title" class="form-input" type="text" placeholder="输入账单标题" />
    </div>

    <div class="form-group">
      <label class="form-label">金额</label>
      <div class="amount-row">
        <AmountInput v-model="form.amount" class="amount-input" />
        <select v-model="form.currency" class="form-select currency-select">
          <option value="CNY">CNY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
    </div>

    <div class="account-row">
      <div v-if="showFrom" class="form-group">
        <label class="form-label">出账账户</label>
        <AccountPicker
          v-model="form.fromAccountId"
          :accounts="accounts"
          placeholder="请选择出账账户"
          clearable
          @create="emit('create-account', $event)"
        />
      </div>
      <div v-if="showTo" class="form-group">
        <label class="form-label">入账账户</label>
        <AccountPicker
          v-model="form.toAccountId"
          :accounts="accounts"
          placeholder="请选择入账账户"
          clearable
          @create="emit('create-account', $event)"
        />
      </div>
    </div>
    <div v-if="sameAccountWarning" class="form-hint warn">出账与入账不能是同一账户</div>

    <div v-if="form.type === 'debt'" class="form-group">
      <label class="form-label">借贷类型</label>
      <div class="type-selector">
        <button
          v-for="t in debtOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.debtSubtype === t.value }"
          @click="form.debtSubtype = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div v-if="form.type === 'income' || form.type === 'expense'" class="form-group">
      <label class="form-label">分类</label>
      <CategoryPicker
        v-model="form.categoryId"
        :categories="categories"
        :type="form.type === 'income' ? 'income' : 'expense'"
        placeholder="请选择分类"
        clearable
        @create="emit('create-category', $event)"
        @open-form="emit('open-category-form', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">日期</label>
      <DateTimePicker v-model="form.date" clearable />
    </div>

    <div class="form-group">
      <label class="form-label">备注</label>
      <textarea v-model="form.description" class="form-textarea" rows="2" placeholder="可选" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BillFormData, Account, BillCategory, BillType, DebtSubtype, CategoryType, AccountFormData } from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import AmountInput from './AmountInput.vue'
import DateTimePicker from './DateTimePicker.vue'

const props = defineProps<{
  modelValue: BillFormData
  accounts: Account[]
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BillFormData): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string }): void
  (e: 'create-account', data: AccountFormData): void
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

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const showFrom = computed(() => form.value.type !== 'income')
const showTo = computed(() => form.value.type !== 'expense')

const sameAccountWarning = computed(() =>
  !!form.value.fromAccountId &&
  !!form.value.toAccountId &&
  form.value.fromAccountId === form.value.toAccountId
)
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.form-select,
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
.form-select:focus,
.form-textarea:focus {
  border-color: rgb(0, 122, 255);
}
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.type-selector {
  display: flex;
  gap: 8px;
}
.type-btn {
  flex: 1;
  padding: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.type-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.amount-row {
  display: flex;
  gap: 8px;
}
.amount-input {
  flex: 1;
}
.currency-select {
  min-width: 80px;
}
.account-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.form-hint.warn {
  color: rgb(255, 59, 48);
}
</style>
