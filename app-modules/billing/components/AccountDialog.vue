<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ isEditing ? '编辑账户' : '添加账户' }}</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <AccountForm v-model="form" :categories="categories" />
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="onCancel">取消</button>
          <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Account, AccountFormData, BillCategory, AccountType } from '~/types/bill'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import AccountForm from './AccountForm.vue'

const props = defineProps<{
  visible: boolean
  account?: Account
  categories?: BillCategory[]
  defaultName?: string
  defaultType?: AccountType
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  confirm: [data: AccountFormData, isEditing: boolean, id?: string]
  cancel: []
}>()

const form = ref<AccountFormData>({
  name: '', type: 'personal', currency: 'CNY', icon: '', color: '', subtype: 'cash', aliases: []
})

const isEditing = computed(() => !!props.account)

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.account) {
    const base: AccountFormData = {
      name: props.account.name,
      type: props.account.type,
      currency: props.account.currency,
      icon: props.account.icon || '',
      color: props.account.color || '',
      aliases: Array.isArray(props.account.aliases) ? [...props.account.aliases] : [],
      categoryId: props.account.categoryId
    }
    if (props.account.type === 'personal') {
      base.subtype = props.account.subtype || 'cash'
      if (base.subtype === 'credit_card') {
        base.creditLimit = props.account.creditLimit ?? 0
        base.billingDay = props.account.billingDay ?? 1
        base.repaymentDay = props.account.repaymentDay ?? 1
      }
    }
    form.value = base
  } else {
    form.value = {
      name: props.defaultName || '',
      type: props.defaultType || 'personal',
      currency: 'CNY',
      icon: '',
      color: '',
      subtype: 'cash',
      aliases: []
    }
  }
})

function onConfirm() {
  if (!form.value.name.trim()) return
  emit('confirm', form.value, isEditing.value, props.account?.id)
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
}
.dialog-body {
  padding: 20px;
}
.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}
.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
}
</style>
