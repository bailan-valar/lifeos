<template>
  <BaseDialog
    v-model:visible="internalVisible"
    :title="isEditMode ? '编辑待办' : '新建待办'"
    size="large"
    @opened="onDialogOpened"
  >
    <div class="todo-edit-form">
      <!-- 基本信息区域 -->
      <div class="form-section">
        <h4 class="section-title">基本信息</h4>

        <div class="form-group">
          <label class="form-label">待办内容 <span class="required">*</span></label>
          <textarea
            ref="textInput"
            v-model="form.text"
            class="liquid-glass-input content-textarea"
            rows="3"
            placeholder="输入待办事项内容..."
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">待办类型</label>
            <SelectPicker
              v-model="form.typeId"
              :options="typeOptions"
              placeholder="选择类型（可选）"
              clearable
            />
          </div>

          <div class="form-group">
            <label class="form-label">优先级</label>
            <SelectPicker
              v-model="form.priority"
              :options="priorityOptions"
              placeholder="选择优先级"
              clearable
            >
              <template #default="{ option }">
                <div class="priority-option">
                  <Icon :name="option.icon || 'solar:info-circle-linear'" :size="16" :color="option.color" />
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </SelectPicker>
          </div>
        </div>
      </div>

      <!-- 时间设置区域 -->
      <div class="form-section">
        <h4 class="section-title">时间设置</h4>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">
              <Icon :name="ICONS.clockCircle || 'solar:clock-circle-linear'" :size="14" />
              开始时间
            </label>
            <DateTimePicker
              :model-value="form.startDate || ''"
              @update:model-value="form.startDate = $event || null"
              placeholder="设置开始时间"
              clearable
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <Icon :name="SOLAR_ICONS.billing.calendar || 'solar:calendar-linear'" :size="14" />
              截止时间
            </label>
            <DateTimePicker
              :model-value="form.dueDate || ''"
              @update:model-value="form.dueDate = $event || null"
              placeholder="设置截止时间"
              clearable
            />
          </div>
        </div>
      </div>

      <!-- 状态和关联区域 -->
      <div class="form-section">
        <h4 class="section-title">状态和关联</h4>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">状态</label>
            <SelectPicker
              v-model="form.statusId"
              :options="statusOptions"
              placeholder="选择状态"
            >
              <template #default="{ option }">
                <div class="status-option">
                  <div
                    class="status-icon"
                    :style="{ backgroundColor: `${option.color}20`, color: option.color }"
                  >
                    <Icon :name="option.icon || 'solar:info-circle-linear'" :size="14" />
                  </div>
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </SelectPicker>
          </div>

          <div class="form-group">
            <label class="form-label">
              <Icon :name="SOLAR_ICONS.doc.notebook || 'solar:notebook-linear'" :size="14" />
              绑定笔记
            </label>
            <SelectPicker
              v-model="form.noteId"
              :options="noteOptions"
              placeholder="选择笔记（可选）"
              clearable
              searchable
            >
              <template #default="{ option }">
                <div class="note-option" :style="{ paddingLeft: `${(option.level || 0) * 16 + 8}px` }">
                  <span class="note-icon">{{ '　'.repeat(option.level || 0) }}</span>
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </SelectPicker>
          </div>
        </div>

        <!-- 父任务选择（仅在创建子任务时显示） -->
        <div v-if="showParentSelector" class="form-group">
          <label class="form-label">父任务</label>
          <SelectPicker
            v-model="form.parentId"
            :options="parentTodoOptions"
            placeholder="选择父任务（可选）"
            clearable
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="footer-left">
        <button
          v-if="isEditMode"
          class="liquid-glass-button delete-button"
          @click="onDelete"
        >
          <Icon :name="SOLAR_ICONS.action.delete || 'solar:trash-bin-trash-linear'" :size="16" />
          <span>删除</span>
        </button>
      </div>
      <div class="footer-right">
        <button class="liquid-glass-button" @click="onCancel">
          取消
        </button>
        <button
          class="liquid-glass-button liquid-glass-button-primary"
          :disabled="!form.text.trim()"
          @click="onConfirm"
        >
          <Icon :name="SOLAR_ICONS.action.save || 'solar:check-circle-linear'" :size="16" />
          <span>{{ isEditMode ? '保存' : '创建' }}</span>
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import SelectPicker from '~/components/SelectPicker.vue'
import DateTimePicker from '~/app-modules/billing/components/DateTimePicker.vue'
import { useNotes } from '~/composables/useNotes'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useConfirm } from '~/composables/useConfirm'
import type { TodoType, TodoItem, TodoStatus } from '~/types/todo'

interface Props {
  visible?: boolean
  todo?: TodoItem | null
  parentId?: string
  availableParentTodos?: TodoItem[]
  initialData?: Partial<TodoItem> | null
  isCreating?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', todo: TodoItem): void
  (e: 'create', todo: TodoItem): void
  (e: 'delete', todo: TodoItem): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  todo: null,
  parentId: '',
  availableParentTodos: () => [],
  initialData: null,
  isCreating: false
})

const emit = defineEmits<Emits>()

const { confirm } = useConfirm()
const { noteOptions: rawNoteOptions, loadNotes } = useNotes()
const { statuses, loadStatuses, getDefaultStatus } = useTodoStatus()

// 转换笔记选项格式以适配 SelectPicker
const noteOptions = computed(() => {
  return rawNoteOptions.value.map(note => ({
    value: note.id,
    label: note.title,
    level: note.level
  }))
})

const internalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const textInput = ref<HTMLTextAreaElement | null>(null)

const form = reactive<{
  text: string
  typeId: string | null
  priority: string | null
  startDate: string | null
  dueDate: string | null
  statusId: string | null
  noteId: string | null
  parentId: string | null
}>({
  text: '',
  typeId: null,
  priority: 'none',
  startDate: null,
  dueDate: null,
  statusId: null,
  noteId: null,
  parentId: null
})

const isEditMode = computed(() => !!props.todo)

const showParentSelector = computed(() => {
  return !props.parentId && props.availableParentTodos.length > 0
})

// 待办类型选项
const todoTypes = ref<TodoType[]>([])
const typeOptions = computed(() => {
  return todoTypes.value.map(type => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
    color: type.color
  }))
})

// 优先级选项
const priorityOptions = computed(() => {
  return [
    { value: 'none' as const, label: '无', icon: 'solar:circle-linear', color: '#9ca3af' },
    { value: 'low' as const, label: '低', icon: 'solar:circle-linear', color: '#3b82f6' },
    { value: 'medium' as const, label: '中', icon: 'solar:circle-linear', color: '#f59e0b' },
    { value: 'high' as const, label: '高', icon: 'solar:circle-linear', color: '#ef4444' }
  ]
})

// 状态选项
const statusOptions = computed(() => {
  return statuses.value.map(status => ({
    value: status.id,
    label: status.name,
    icon: status.icon,
    color: status.color
  }))
})

// 父任务选项
const parentTodoOptions = computed(() => {
  return props.availableParentTodos.map(todo => ({
    value: todo.id,
    label: todo.text,
    disabled: todo.id === props.todo?.id
  }))
})

// 加载待办类型
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

// 初始化表单
const initForm = () => {
  // 辅助函数：将日期格式 (YYYY-MM-DD) 转换为 DateTimePicker 格式 (YYYY-MM-DDTHH:mm)
  const toPickerFormat = (value: string | undefined): string => {
    if (!value) return ''
    // 如果已经是完整格式，直接返回
    if (value.includes('T')) return value
    // 否则添加默认时间部分
    return value + 'T00:00'
  }

  if (props.todo) {
    // 编辑模式
    form.text = props.todo.text || ''
    form.typeId = props.todo.typeId || null
    form.priority = props.todo.priority || 'none'
    form.startDate = toPickerFormat(props.todo.startDate) || null
    form.dueDate = toPickerFormat(props.todo.dueDate) || null
    form.statusId = props.todo.statusId || null
    form.noteId = props.todo.noteId || null
    form.parentId = props.todo.parentId || null
  } else {
    // 新建模式
    form.text = ''
    form.typeId = null
    form.priority = 'none'
    // 使用 initialData 预填充日期和时间
    form.startDate = props.initialData?.startDate ? toPickerFormat(props.initialData.startDate) : null
    form.dueDate = props.initialData?.dueDate ? toPickerFormat(props.initialData.dueDate) : null
    form.statusId = getDefaultStatus()?.id || null
    form.noteId = props.initialData?.noteId || null
    form.parentId = props.parentId || null
  }
}

// 保存待办
const onConfirm = async () => {
  if (!form.text.trim()) {
    return
  }

  // 辅助函数：处理日期时间值，保留完整格式
  // 如果值包含时间部分 (YYYY-MM-DDTHH:mm)，保留完整格式
  // 如果值只有日期部分 (YYYY-MM-DD)，直接使用
  const formatDateTime = (value: string | null): string | undefined => {
    if (!value) return undefined
    // 如果已经是完整格式，直接返回
    if (value.includes('T')) return value
    // 否则只返回日期部分
    return value.slice(0, 10) // YYYY-MM-DD
  }

  try {
    if (isEditMode.value && props.todo) {
      // 更新现有待办
      const updatedTodo: TodoItem = {
        ...props.todo,
        text: form.text.trim(),
        typeId: form.typeId || undefined,
        priority: (form.priority || undefined) as TodoItem['priority'],
        startDate: formatDateTime(form.startDate),
        dueDate: formatDateTime(form.dueDate),
        statusId: form.statusId || undefined,
        noteId: form.noteId || undefined,
        parentId: form.parentId || undefined
      }
      emit('save', updatedTodo)
    } else {
      // 创建新待办
      const { generateId, now } = await import('~/services/db')
      const newTodo: TodoItem = {
        id: generateId(),
        text: form.text.trim(),
        completed: false,
        typeId: form.typeId || undefined,
        priority: (form.priority || undefined) as TodoItem['priority'],
        startDate: formatDateTime(form.startDate),
        dueDate: formatDateTime(form.dueDate),
        statusId: form.statusId || undefined,
        noteId: form.noteId || undefined,
        parentId: form.parentId || undefined,
        createdAt: now()
      }
      emit('create', newTodo)
    }

    internalVisible.value = false
  } catch (error) {
    console.error('保存待办失败:', error)
  }
}

// 取消操作
const onCancel = () => {
  internalVisible.value = false
}

// 删除待办
const onDelete = async () => {
  if (!props.todo) return

  const ok = await confirm({
    message: `确定要删除待办 "${props.todo.text}" 吗？`,
    danger: true
  })
  if (!ok) return

  emit('delete', props.todo)
  internalVisible.value = false
}

// 弹窗动画完成后聚焦
const onDialogOpened = () => {
  textInput.value?.focus()
}

// 初始化时加载数据
onMounted(async () => {
  if (props.visible) {
    await Promise.all([
      loadTodoTypes(),
      loadStatuses(),
      loadNotes()
    ])
    initForm()
  }
})

// 监听 visible 变化
watch(() => props.visible, async (visible) => {
  if (visible) {
    await Promise.all([
      loadTodoTypes(),
      loadStatuses(),
      loadNotes()
    ])
    initForm()
  }
}, { immediate: true })
</script>

<style scoped>
/* Footer 布局 */
.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.delete-button {
  color: #ef4444;
}

.delete-button:hover {
  background: rgba(239, 68, 68, 0.15);
}

@media (prefers-color-scheme: dark) {
  .delete-button {
    color: #f87171;
  }

  .delete-button:hover {
    background: rgba(248, 113, 113, 0.15);
  }
}

.todo-edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  font-size: 14px;
}

.form-label .required {
  color: #ef4444;
}

.content-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* 选择器选项样式 */
.priority-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-option {
  display: flex;
  align-items: center;
}

.note-icon {
  display: inline-block;
  width: 16px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .section-title {
    color: rgba(255, 255, 255, 0.6);
  }

  .form-label {
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
