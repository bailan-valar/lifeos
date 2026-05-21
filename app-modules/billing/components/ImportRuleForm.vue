<template>
  <div class="form-body">
    <div class="form-row triple-row">
      <div class="form-group">
        <label class="form-label">来源</label>
        <SelectPicker
          v-model="form.source"
          :options="sourceOptions.map(s => ({ value: s.value, label: s.label }))"
          placeholder="请选择来源"
        />
      </div>
      <div class="form-group">
        <label class="form-label">匹配字段</label>
        <SelectPicker
          v-model="form.matchField"
          :options="matchFieldOptions.map(f => ({ value: f.value, label: f.label }))"
          placeholder="请选择匹配字段"
        />
      </div>
      <div class="form-group">
        <label class="form-label">匹配方式</label>
        <SelectPicker
          v-model="form.matchMode"
          :options="matchModeOptions.map(m => ({ value: m.value, label: m.label }))"
          placeholder="请选择匹配方式"
        />
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

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">账单类型</label>
        <BillTypePicker
          v-model="form.billType"
          placeholder="不指定"
          clearable
        />
      </div>
      <div class="form-group">
        <label class="form-label">分类</label>
        <CategoryPicker
          v-model="form.categoryId"
          :categories="categories"
          placeholder="不设置"
          clearable
        />
      </div>
    </div>
    <div class="form-hint" style="margin-top:-12px">不指定账单类型则按金额方向与账户类型自动推断</div>

    <div class="form-group">
      <label class="form-label">匹配账户</label>
      <AccountPicker
        v-model="form.accountId"
        :accounts="accounts"
        placeholder="不设置"
        clearable
      />
      <div class="form-hint">命中规则后，将该交易对应为此账户，自动推导出入账方向</div>
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
  ImportRuleMatchField,
  ImportSource,
  Account,
  BillCategory
} from '~/types/bill'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import BillTypePicker from './BillTypePicker.vue'
import SelectPicker from './SelectPicker.vue'

type SourceValue = ImportSource | 'all'

const props = defineProps<{
  modelValue: ImportRuleFormData
  accounts: Account[]
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ImportRuleFormData): void
}>()

const sourceOptions: { value: SourceValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'cmb', label: '招商银行' }
]

type MatchFieldValue = ImportRuleMatchField

const matchFieldOptions: { value: MatchFieldValue; label: string }[] = [
  { value: 'account', label: '账户' },
  { value: 'description', label: '商品说明' },
  { value: 'rawType', label: '原始分类' }
]

const matchModeOptions: { value: ImportRuleMatchMode; label: string }[] = [
  { value: 'exact', label: '精确' },
  { value: 'fuzzy', label: '模糊' },
  { value: 'regex', label: '正则' }
]

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})



const patternPlaceholder = computed(() => {
  const field = form.value.matchField ?? 'account'
  const fieldHint = field === 'description' ? '商品说明' : field === 'rawType' ? '原始分类' : '对方名或付款方式'
  const fieldExample = field === 'description' ? '美式咖啡' : field === 'rawType' ? '餐饮美食' : '星巴克咖啡(国贸店)'
  const fieldExampleShort = field === 'description' ? '咖啡' : field === 'rawType' ? '餐饮' : '星巴克'
  switch (form.value.matchMode) {
    case 'exact':
      return `完整${fieldHint},如:${fieldExample}`
    case 'fuzzy':
      return `包含关键字,如:${fieldExampleShort}`
    case 'regex':
      return `^${fieldExampleShort}.*$`
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
.form-input {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-input:focus {
  border-color: rgb(0, 122, 255);
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
.form-row.triple-row {
  grid-template-columns: 1fr 1fr 1fr;
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
