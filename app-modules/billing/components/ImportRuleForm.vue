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
      <select v-model="form.categoryId" class="form-select">
        <option value="">不设置</option>
        <optgroup v-if="incomeCategories.length" label="收入分类">
          <option v-for="c in incomeCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </optgroup>
        <optgroup v-if="expenseCategories.length" label="支出分类">
          <option v-for="c in expenseCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </optgroup>
      </select>
    </div>

    <div class="account-row">
      <div class="form-group">
        <label class="form-label">出账账户</label>
        <select v-model="form.fromAccountId" class="form-select">
          <option value="">不设置</option>
          <optgroup v-if="personalAccounts.length" label="我的账户">
            <option v-for="a in personalAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </optgroup>
          <optgroup v-if="otherAccounts.length" label="外部账户">
            <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">入账账户</label>
        <select v-model="form.toAccountId" class="form-select">
          <option value="">不设置</option>
          <optgroup v-if="personalAccounts.length" label="我的账户">
            <option v-for="a in personalAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </optgroup>
          <optgroup v-if="otherAccounts.length" label="外部账户">
            <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </optgroup>
        </select>
      </div>
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
  BillCategory
} from '~/types/bill'

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
  { value: 'wechat', label: '微信' }
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

const personalAccounts = computed(() => props.accounts.filter(a => a.type === 'personal'))
const otherAccounts = computed(() => props.accounts.filter(a => a.type === 'other'))

const incomeCategories = computed(() => props.categories.filter(c => c.type === 'income'))
const expenseCategories = computed(() => props.categories.filter(c => c.type === 'expense'))

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
