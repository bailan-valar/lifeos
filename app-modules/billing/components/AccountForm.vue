<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">账户名称</label>
      <input v-model="form.name" class="form-input" type="text" placeholder="如：现金、支付宝、张三、星巴克" />
    </div>
    <div class="form-group">
      <label class="form-label">账户类型</label>
      <div class="type-selector">
        <button
          v-for="t in typeOptions"
          :key="t.value"
          type="button"
          class="type-btn"
          :class="{ active: form.type === t.value }"
          @click="onTypeChange(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="form-hint">{{ typeHint }}</div>
    </div>
    <div v-if="form.type === 'personal'" class="form-group">
      <label class="form-label">资金账户形态</label>
      <div class="subtype-grid">
        <button
          v-for="s in subtypeOptions"
          :key="s.value"
          type="button"
          class="type-btn"
          :class="{ active: (form.subtype || 'cash') === s.value }"
          @click="onSubtypeChange(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
    </div>
    <template v-if="form.type === 'personal' && form.subtype === 'credit_card'">
      <div class="form-group">
        <label class="form-label">信用额度</label>
        <input
          :value="form.creditLimit ?? 0"
          class="form-input"
          type="number"
          min="0"
          step="0.01"
          @input="onCreditLimitInput(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">账单日（每月 1-28 日）</label>
          <input
            :value="form.billingDay ?? 1"
            class="form-input"
            type="number"
            min="1"
            max="28"
            step="1"
            @input="onBillingDayInput(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="form-group">
          <label class="form-label">还款日（每月 1-28 日）</label>
          <input
            :value="form.repaymentDay ?? 1"
            class="form-input"
            type="number"
            min="1"
            max="28"
            step="1"
            @input="onRepaymentDayInput(($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </template>
    <div v-if="form.type !== 'personal'" class="form-group">
      <label class="form-label">别名（每行一个，用于 CSV 导入自动匹配）</label>
      <textarea
        :value="aliasesText"
        class="form-textarea"
        rows="3"
        :placeholder="aliasesPlaceholder"
        @input="onAliasesInput(($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="form-hint">如:支付宝商户名、对方真实姓名、昵称等</div>
    </div>
    <div v-if="form.type === 'merchant'" class="form-group">
      <label class="form-label">默认分类（CSV 导入时自动填充）</label>
      <CategoryPicker
        :model-value="form.categoryId || ''"
        :categories="categories || []"
        type="expense"
        placeholder="选择关联分类"
        clearable
        @update:model-value="onCategoryChange"
      />
    </div>
    <div class="form-group">
      <IconPicker v-model="form.icon" :icons="presetIcons" label="图标" />
    </div>

    <div class="form-group">
      <label class="form-label">颜色</label>
      <div class="color-picker">
        <button
          v-for="color in presetColors"
          :key="color"
          type="button"
          class="color-option"
          :class="{ active: form.color === color }"
          :style="{ background: color }"
          @click="form.color = color"
        />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">币种</label>
      <SelectPicker
        v-model="form.currency"
        :options="currencyOptions"
        placeholder="选择币种"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccountFormData, AccountType, AccountSubtype, BillCategory } from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'
import IconPicker from '~/components/IconPicker.vue'

const props = defineProps<{
  modelValue: AccountFormData
  categories?: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AccountFormData): void
}>()

const typeOptions: Array<{ value: AccountType; label: string }> = [
  { value: 'personal', label: '我的账户' },
  { value: 'merchant', label: '商户' },
  { value: 'contact', label: '联系人' },
  { value: 'other', label: '其他' }
]

const subtypeOptions: Array<{ value: AccountSubtype; label: string }> = [
  { value: 'cash', label: '现金' },
  { value: 'debit_card', label: '储蓄卡' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'online_account', label: '网络账户' }
]

const presetIcons = [
  'solar:wallet-linear',
  'solar:card-linear',
  'solar:cart-linear',
  'solar:bag-linear',
  'solar:home-linear',
  'solar:kick-scooter-linear',
  'solar:cpu-linear',
  'solar:bolt-linear',
  'solar:heart-linear',
  'solar:star-linear',
  'solar:chef-hat-linear',
  'solar:cup-hot-linear',
  'solar:bus-linear',
  'solar:health-linear',
  'solar:book-linear',
  'solar:gift-linear'
]

const presetColors = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
  '#8E8E93'
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

const typeHint = computed(() => {
  switch (form.value.type) {
    case 'personal':
      return '我自己的资金账户(现金/银行卡/网络账户/信用卡)'
    case 'merchant':
      return '商家、平台或机构,导入时归为支出,可关联默认分类'
    case 'contact':
      return '亲友或借贷对手,导入时默认归为借贷(借出/借入)'
    case 'other':
      return '不属于以上类别的账户'
    default:
      return ''
  }
})

const aliasesPlaceholder = computed(() => {
  switch (form.value.type) {
    case 'merchant':
      return '示例:\n星巴克咖啡\nStarbucks\n星巴克(国贸店)'
    case 'contact':
      return '示例:\n张三\nZhang San\n小张'
    default:
      return '一行一个'
  }
})

const aliasesText = computed(() => (form.value.aliases ?? []).join('\n'))

function clampDay(n: number): number {
  if (isNaN(n)) return 1
  return Math.max(1, Math.min(28, Math.floor(n)))
}

function onTypeChange(t: AccountType) {
  if (t === 'personal') {
    emit('update:modelValue', {
      ...form.value,
      type: t,
      subtype: form.value.subtype || 'cash'
    })
  } else {
    const next: AccountFormData = { ...form.value, type: t }
    delete next.subtype
    delete next.creditLimit
    delete next.billingDay
    delete next.repaymentDay
    emit('update:modelValue', next)
  }
}

function onSubtypeChange(s: AccountSubtype) {
  const next: AccountFormData = { ...form.value, subtype: s }
  if (s === 'credit_card') {
    next.creditLimit = typeof form.value.creditLimit === 'number' ? form.value.creditLimit : 0
    next.billingDay = clampDay(form.value.billingDay ?? 1)
    next.repaymentDay = clampDay(form.value.repaymentDay ?? 1)
  } else {
    delete next.creditLimit
    delete next.billingDay
    delete next.repaymentDay
  }
  emit('update:modelValue', next)
}

function onCreditLimitInput(raw: string) {
  const v = parseFloat(raw)
  emit('update:modelValue', {
    ...form.value,
    creditLimit: isNaN(v) ? 0 : v
  })
}

function onBillingDayInput(raw: string) {
  const v = parseInt(raw, 10)
  emit('update:modelValue', {
    ...form.value,
    billingDay: clampDay(v)
  })
}

function onRepaymentDayInput(raw: string) {
  const v = parseInt(raw, 10)
  emit('update:modelValue', {
    ...form.value,
    repaymentDay: clampDay(v)
  })
}

function onAliasesInput(raw: string) {
  const list = raw.split('\n').map(s => s.trim()).filter(Boolean)
  const unique = [...new Set(list)]
  emit('update:modelValue', {
    ...form.value,
    aliases: unique
  })
}

function onCategoryChange(id: string) {
  emit('update:modelValue', {
    ...form.value,
    categoryId: id || undefined
  })
}
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
.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group {
  flex: 1;
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
  font-family: inherit;
  resize: vertical;
}
.form-input:focus,
.form-textarea:focus {
  border-color: rgb(0, 122, 255);
}
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.type-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.subtype-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.type-btn {
  flex: 1;
  min-width: 80px;
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
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.color-option {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.color-option:hover {
  transform: scale(1.1);
}
.color-option.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
}
</style>
