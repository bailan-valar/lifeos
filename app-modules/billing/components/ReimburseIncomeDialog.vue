<script setup lang="ts">
import type { ReimbursementGroupView } from '~/types/reimbursement'
import type { ReimbursementIncomeFormData } from '~/types/reimbursement'
import { toLocalISO } from '~/services/db'

const props = defineProps<{
  visible: boolean
  group: ReimbursementGroupView | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', data: ReimbursementIncomeFormData): void
}>()

const amount = ref(0)
const accountId = ref<string | null>(null)
const date = ref(toLocalISO(new Date()))
const description = ref('')

// 打开时重置
watch(() => props.visible, (val) => {
  if (val && props.group) {
    amount.value = props.group.totalExpense
    accountId.value = null
    date.value = toLocalISO(new Date())
    description.value = ''
  }
})

const isValid = computed(() =>
  amount.value > 0 &&
  accountId.value !== null &&
  date.value.length > 0 &&
  props.group !== null &&
  amount.value <= (props.group?.totalExpense ?? 0)
)

const isPartial = computed(() =>
  props.group !== null && amount.value < props.group.totalExpense
)

function onConfirm() {
  if (!isValid.value || !accountId.value) return
  emit('confirm', {
    amount: amount.value,
    accountId: accountId.value,
    date: date.value,
    description: description.value || undefined,
  })
  emit('update:visible', false)
}

function onClose() {
  emit('update:visible', false)
}
</script>

<template>
  <BaseDialog
    :visible="visible"
    title="记录报销回款"
    size="small"
    @update:visible="onClose"
  >
    <div v-if="group" class="reimburse-income-form">
      <!-- 报销单信息 -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">报销单</span>
          <span class="info-value">{{ group.title }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">垫付总额</span>
          <span class="info-amount">¥{{ group.totalExpense.toFixed(2) }}</span>
        </div>
      </div>

      <!-- 金额输入 -->
      <div class="form-section">
        <label class="section-label">回款金额</label>
        <div class="amount-input-wrapper">
          <span class="currency-symbol">¥</span>
          <input
            v-model.number="amount"
            type="number"
            min="0"
            :max="group.totalExpense"
            step="0.01"
            class="liquid-glass-input amount-input"
            placeholder="0.00"
          />
        </div>
        <div v-if="isPartial" class="partial-hint">
          部分报销：自付 ¥{{ (group.totalExpense - amount).toFixed(2) }}
        </div>
      </div>

      <!-- 到账账户 -->
      <div class="form-section">
        <label class="section-label">到账账户</label>
        <AccountPicker v-model="accountId" placeholder="选择到账账户" />
      </div>

      <!-- 日期 -->
      <div class="form-section">
        <label class="section-label">到账日期</label>
        <input
          v-model="date"
          type="date"
          class="liquid-glass-input"
        />
      </div>

      <!-- 备注 -->
      <div class="form-section">
        <label class="section-label">备注（选填）</label>
        <input
          v-model="description"
          type="text"
          class="liquid-glass-input"
          placeholder="如：公司财务打款"
        />
      </div>
    </div>

    <template #footer>
      <button class="liquid-glass-button" @click="onClose">取消</button>
      <button
        class="liquid-glass-button liquid-glass-button-primary"
        :disabled="!isValid"
        @click="onConfirm"
      >
        确认回款
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.reimburse-income-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: var(--liquid-bg-thin, rgba(255, 255, 255, 0.1));
  border-radius: var(--liquid-radius, 20px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
}

.info-value {
  font-weight: 500;
}

.info-amount {
  font-weight: 600;
  color: var(--accent-light, #818cf8);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 13px;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  font-weight: 500;
}

.amount-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 14px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  pointer-events: none;
}

.amount-input {
  padding-left: 32px;
}

.partial-hint {
  font-size: 12px;
  color: var(--orange, #fb923c);
}
</style>
