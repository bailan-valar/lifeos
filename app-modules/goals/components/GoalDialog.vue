<template>
  <BaseDialog
    :visible="visible"
    :title="isEditing ? '编辑目标' : '新建目标'"
    size="medium"
    @update:visible="onCancel"
  >
    <GoalForm
      v-model="form"
      :is-editing="isEditing"
      @keydown="onKeyDown"
    />

    <template #footer>
      <button type="button" class="cancel-btn" @click="onCancel">取消</button>
      <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Goal, GoalFormData } from '~/types/goal'
import { useToast } from '~/composables/useToast'
import GoalForm from './GoalForm.vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'

const props = defineProps<{
  visible: boolean
  goal?: Goal
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: GoalFormData, isEditing: boolean, id?: string]
  cancel: []
}>()

const { warning: showWarning } = useToast()

const isEditing = computed(() => !!props.goal)

const defaultForm = (): GoalFormData => ({
  title: '',
  description: '',
  target: 0,
  currentProgress: 0,
  unit: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: 'pending',
  type: 'short_term',
  priority: 'medium',
  noteIds: []
})

const form = ref<GoalFormData>(defaultForm())

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.goal) {
    form.value = {
      id: props.goal.id,
      title: props.goal.title,
      description: props.goal.description,
      target: props.goal.target,
      currentProgress: props.goal.currentProgress,
      unit: props.goal.unit,
      startDate: props.goal.startDate,
      endDate: props.goal.endDate,
      status: props.goal.status,
      type: props.goal.type,
      priority: props.goal.priority,
      noteIds: props.goal.noteIds || []
    }
  } else {
    form.value = defaultForm()
  }
}, { immediate: true })

function onConfirm() {
  if (!form.value.title.trim()) {
    showWarning('请输入目标名称')
    return
  }
  if (form.value.target <= 0) {
    showWarning('目标量必须大于 0')
    return
  }
  if (!form.value.unit.trim()) {
    showWarning('请输入单位')
    return
  }
  if (!form.value.startDate || !form.value.endDate) {
    showWarning('请选择开始和结束日期')
    return
  }
  if (form.value.startDate >= form.value.endDate) {
    showWarning('结束日期必须晚于开始日期')
    return
  }
  emit('confirm', form.value, isEditing.value, props.goal?.id)
}

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  }
}
</script>

<style scoped>
.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--liquid-radius-button);
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
