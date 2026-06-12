<template>
  <BaseDialog
    :visible="visible"
    :title="dialogTitle"
    size="large"
    @update:visible="$emit('update:visible', $event)"
    @close="$emit('close')"
  >
    <BillPicker
      ref="pickerRef"
      :model-value="selectedBillId"
      :filter="pickerFilter"
      :default-search="sourceBill?.amount.toFixed(2) ?? ''"
      empty-text="没有可关联的账单"
      @select="onPickerSelect"
    />

    <!-- 金额不一致警告 -->
    <div v-if="amountMismatch" class="amount-warning">
      <Icon :name="SOLAR_ICONS.status.warning" size="16" />
      <span class="caption1">退款金额 (¥{{ selectedBill?.amount.toFixed(2) }}) 与原账单金额 (¥{{ sourceBill?.amount.toFixed(2) }}) 不一致</span>
    </div>

    <template #footer>
      <button class="liquid-glass-button" @click="$emit('update:visible', false)">取消</button>
      <button
        class="liquid-glass-button liquid-glass-button-primary"
        :disabled="!selectedBillId"
        @click="confirm"
      >
        确认关联
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import BillPicker from './BillPicker.vue'
import type { BillPickerFilter } from './BillPicker.vue'
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { Bill } from '~/types/bill'

const props = defineProps<{
  visible: boolean
  sourceBill: Bill | null
  mode: 'link-refund' | 'link-as-refund'
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [bill: Bill]
  close: []
}>()

const pickerRef = ref<InstanceType<typeof BillPicker> | null>(null)
const selectedBillId = ref<string | null>(null)
const selectedBill = ref<Bill | null>(null)

const dialogTitle = computed(() =>
  props.mode === 'link-refund' ? '选择退款账单' : '选择原始支出账单'
)

const pickerFilter = computed<BillPickerFilter>(() => {
  if (!props.sourceBill) return {}
  return {
    noteId: props.sourceBill.noteId,
    type: props.mode === 'link-refund' ? 'income' : 'expense',
    excludeIds: [props.sourceBill.id],
    excludeRefund: true,
    excludeChild: true,
    excludeCancelled: true,
  }
})

const amountMismatch = computed(() => {
  if (!selectedBill.value || !props.sourceBill) return false
  return selectedBill.value.amount !== props.sourceBill.amount
})

function onPickerSelect(bill: Bill) {
  selectedBillId.value = bill.id
  selectedBill.value = bill
}

function confirm() {
  if (!selectedBill.value) return
  emit('select', selectedBill.value)
}

// visible 变化时重置选中状态
watch(() => props.visible, (visible) => {
  if (visible) {
    selectedBillId.value = null
    selectedBill.value = null
  }
})
</script>

<style scoped>
.amount-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-top: 8px;
  background: rgba(255, 149, 0, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  color: rgb(255, 149, 0);
}
</style>
