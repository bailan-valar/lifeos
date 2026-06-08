<template>
  <div class="todo-type-picker">
    <SelectPicker
      :model-value="modelValue"
      :options="typeOptions"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      searchable
      creatable
      always-show-create-button
      quick-create-text="创建新类型"
      @update:model-value="emit('update:modelValue', $event)"
      @create="onOpenCreateDialog"
    >
      <template #default="{ option }">
        <div class="type-option">
          <div class="type-option-icon" :style="{ background: `${option.color}20`, color: option.color }">
            <Icon :name="option.icon || 'solar:folder-linear'" :size="16" />
          </div>
          <span>{{ option.label }}</span>
        </div>
      </template>
    </SelectPicker>

    <!-- 创建/编辑待办类型弹窗 -->
    <TodoTypeEditDialog
      v-model:visible="editDialogVisible"
      @save="onTypeSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import SelectPicker from '~/components/SelectPicker.vue'
import TodoTypeEditDialog from '~/components/todo/TodoTypeEditDialog.vue'

interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  order: number
}

interface Props {
  modelValue: string | null
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择类型（可选）',
  clearable: true,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'created': [type: TodoType]
}>()

const todoTypes = ref<TodoType[]>([])
const editDialogVisible = ref(false)

const typeOptions = computed(() => {
  return todoTypes.value.map(type => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
    color: type.color
  }))
})

const loadTodoTypes = async () => {
  try {
    const { getDB } = await import('~/services/db')
    const db = await getDB()
    const docs = await db.todo_types.find().exec()
    todoTypes.value = docs.map(doc => doc.toJSON()) as TodoType[]
  } catch (error) {
    console.error('加载待办类型失败:', error)
  }
}

const onOpenCreateDialog = () => {
  editDialogVisible.value = true
}

const onTypeSaved = async (typeData: TodoType & { id?: string }) => {
  try {
    const { getDB, generateId, now } = await import('~/services/db')
    const db = await getDB()

    if (typeData.id) {
      // 编辑现有类型
      await db.todo_types.upsert({
        id: typeData.id,
        name: typeData.name,
        icon: typeData.icon,
        color: typeData.color,
        description: typeData.description,
        order: typeData.order,
        createdAt: typeData.createdAt || now(),
        updatedAt: now()
      })
    } else {
      // 创建新类型
      const maxOrder = Math.max(0, ...todoTypes.value.map(t => t.order || 0))
      const newType: TodoType = {
        id: generateId(),
        name: typeData.name,
        icon: typeData.icon,
        color: typeData.color,
        order: maxOrder + 1,
        createdAt: now(),
        updatedAt: now()
      } as TodoType

      await db.todo_types.insert(newType)

      // 自动选择新创建的类型
      emit('update:modelValue', newType.id)
      emit('created', newType)
    }

    await loadTodoTypes()
  } catch (error) {
    console.error('保存待办类型失败:', error)
  }
}

onMounted(() => {
  loadTodoTypes()
})
</script>

<style scoped>
.todo-type-picker {
  width: 100%;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-option-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
