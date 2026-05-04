<template>
  <div class="form-body">
    <div class="form-group">
      <label class="form-label">规则名称</label>
      <input v-model="form.name" class="form-input" type="text" placeholder="例如:星巴克 → 餐饮" />
    </div>

    <div class="form-group">
      <label class="form-label">来源</label>
      <div class="type-selector">
        <button
          v-for="s in sourceOptions"
          :key="s.value"
          type="button"
          class="type-btn"
          :class="{ active: form.source === s.value }"
          @click="form.source = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">匹配方式</label>
      <div class="type-selector">
        <button
          v-for="m in matchModeOptions"
          :key="m.value"
          type="button"
          class="type-btn"
          :class="{ active: form.matchMode === m.value }"
          @click="form.matchMode = m.value"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">匹配关键字</label>
      <input
        v-model="form.pattern"
        class="form-input"
        type="text"
        :placeholder="patternPlaceholder"
      />
    </div>

    <div class="form-group">
      <label class="form-label">分类</label>
      <CategoryPicker
        v-model="form.categoryId"
        :categories="categories"
        placeholder="不设置"
        clearable
        @create="emit('create-category', $event)"
        @open-form="emit('open-category-form', $event)"
      />
    </div>

    <div class="form-group">
      <label class="form-label">账单类型</label>
      <div class="type-selector type-selector-wrap">
        <button
          v-for="t in billTypeOptions"
          :key="t.value ?? 'auto'"
          type="button"
          class="type-btn"
          :class="{ active: (form.billType ?? null) === t.value }"
          @click="setBillType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="form-hint">不指定则按金额方向与账户类型自动推断</div>
    </div>

    <div class="form-group">
      <label class="form-label">匹配账户</label>
      <AccountPicker
        v-model="form.accountId"
        :accounts="accounts"
        placeholder="不设置"
        clearable
        @create="emit('create-account', $event)"
      />
      <div class="form-hint">导入时将该交易对方视为此账户，自动推导出入账方向</div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">优先级</label>
        <input
          v-model.number="form.priority"
          class="form-input"
          type="number"
          placeholder="100"
        />
      </div>
      <div class="form-group">
        <label class="form-label">启用</label>
        <label class="enabled-toggle">
          <input v-model="form.enabled" type="checkbox" />
          <span>{{ form.enabled ? '已启用' : '已禁用' }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ImportRuleFormData,
  ImportRuleMatchMode,
  ImportSource,
  Account,
  BillCategory,
  BillType,
  CategoryType,
  AccountFormData
} from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'

type SourceValue = ImportSource | 'all'

const props = defineProps<{
  modelValue: ImportRuleFormData
  accounts: Account[]
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ImportRuleFormData): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string }): void
  (e: 'create-account', data: AccountFormData): void
}>()

const sourceOptions: { value: SourceValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' }
]

const matchModeOptions: { value: ImportRuleMatchMode; label: string }[] = [
  { value: 'exact', label: '精确' },
  { value: 'fuzzy', label: '模糊' },
  { value: 'regex', label: '正则' }
]

const billTypeOptions: { value: BillType | null; label: string }[] = [
  { value: null, label: '不指定' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'transfer', label: '转账' },
  { value: 'debt', label: '借贷' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function setBillType(value: BillType | null) {
  emit('update:modelValue', { ...props.modelValue, billType: value ?? undefined })
}


const patternPlaceholder = computed(() => {
  switch (form.value.matchMode) {
    case 'exact':
      return '完整对方名,如:星巴克咖啡(国贸店)'
    case 'fuzzy':
      return '包含关键字,如:星巴克'
    case 'regex':
      return '^星巴克.*$'
    default:
      return ''
  }
})
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
.form-select {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-input:focus,
.form-select:focus {
  border-color: rgb(0, 122, 255);
}
.type-selector {
  display: flex;
  gap: 8px;
}
.type-selector-wrap {
  flex-wrap: wrap;
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
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.account-row,
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.enabled-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}
</style>
