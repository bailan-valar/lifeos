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
        <select v-model="form.type" class="liquid-glass-select">
          <option v-for="t in typeOptions" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
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
        <select v-model="form.debtSubtype" class="liquid-glass-select">
          <option v-for="t in debtOptions" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">金额</label>
      <div class="amount-row">
        <AmountInput v-model="form.amount" class="amount-input" />
        <select v-model="form.currency" class="liquid-glass-select currency-select">
          <option value="CNY">CNY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
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
  </div>
</template>

<script setup lang="ts">
import type { BillFormData, Account, BillCategory, BillType, DebtSubtype } from '~/types/bill'
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
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BillFormData): void
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
