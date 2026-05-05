<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click="emit('cancel')">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ editing ? '编辑规则' : '保存为规则' }}</h3>
          <button type="button" class="close-btn" @click="emit('cancel')">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <ImportRuleForm
            v-model="form"
            :accounts="accounts"
            :categories="categories"
            @create-category="emit('create-category', $event)"
            @open-category-form="emit('open-category-form', $event)"
            @create-account="emit('create-account', $event)"
          />
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="emit('cancel')">取消</button>
          <button type="button" class="confirm-btn" @click="emit('confirm', form)">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ImportRuleFormData, Account, BillCategory, CategoryType, AccountFormData } from '~/types/bill'
import ImportRuleForm from './ImportRuleForm.vue'

const props = defineProps<{
  form: ImportRuleFormData
  accounts: Account[]
  categories: BillCategory[]
  editing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:form', value: ImportRuleFormData): void
  (e: 'confirm', value: ImportRuleFormData): void
  (e: 'cancel'): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string; defaultName?: string }): void
  (e: 'create-account', data: AccountFormData): void
}>()

const form = computed({
  get: () => props.form,
  set: (v) => emit('update:form', v)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 100%;
  max-width: 520px;
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
