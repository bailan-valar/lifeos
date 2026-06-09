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
            <TodoTypePicker v-model="form.typeId" />
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
            <NoteTreePicker
              v-model="form.noteId"
              :notes="notes"
              placeholder="选择笔记（可选）"
              clearable
            />
          </div>
        </div>

        <!-- 父任务选择 -->
        <div v-if="showParentSelector" class="form-group full-width">
          <label class="form-label">
            <Icon :name="SOLAR_ICONS.layer.layers || 'solar:layers-linear'" :size="14" />
            父任务
          </label>
          <SelectPicker
            v-model="form.parentId"
            :options="parentTodoOptions"
            :placeholder="isEditMode && props.todo?.parentId ? '更改父任务' : '选择父任务（可选）'"
            clearable
            searchable
          />
          <p v-if="isEditMode && props.todo?.parentId && form.parentId !== props.todo.parentId" class="form-hint">
            清除选择后将移除父任务关系
          </p>
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
import NoteTreePicker from '~/components/NoteTreePicker.vue'
import TodoTypePicker from '~/components/todo/TodoTypePicker.vue'
import DateTimePicker from '~/app-modules/billing/components/DateTimePicker.vue'
import { useNotes } from '~/composables/useNotes'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useConfirm } from '~/composables/useConfirm'
import type { TodoItem, TodoStatus } from '~/types/todo'

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
const { notes, loadNotes } = useNotes()
const { statuses, loadStatuses, getDefaultStatus } = useTodoStatus()

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

// 计算当前任务的祖先ID（包括自己），用于禁用会形成循环引用的任务
const ancestorIds = computed(() => {
  if (!props.todo?.parentId) return new Set([props.todo?.id].filter(Boolean))

  const ancestors = new Set<string>()
  const currentTodo = props.availableParentTodos.find(t => t.id === props.todo?.id)
  if (currentTodo) {
    ancestors.add(currentTodo.id)
  }

  // 向上遍历父任务链
  let currentId = props.todo?.parentId
  while (currentId) {
    ancestors.add(currentId)
    const parent = props.availableParentTodos.find(t => t.id === currentId)
    currentId = parent?.parentId || ''
  }

  return ancestors
})

const showParentSelector = computed(() => {
  // 创建模式：有可用的父任务时显示
  // 编辑模式：始终显示（允许更改父任务）
  if (isEditMode.value) {
    return props.availableParentTodos.length > 0
  }
  // 新建且有预定义父任务时显示（如通过"添加子任务"创建）
  if (props.parentId) return true
  // 新建且有可选父任务时显示
  return props.availableParentTodos.length > 0
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
    // 禁用：自己、自己的祖先（会形成循环引用）、自己的子任务
    disabled: ancestorIds.value.has(todo.id) ||
             // 编辑模式下，还要禁用当前任务的直接子任务（避免反向循环）
             (isEditMode.value && props.availableParentTodos.some(t =>
               t.id === todo.id && t.parentId === props.todo?.id
             ))
  }))
})

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

/* 全宽表单组 */
.full-width {
  grid-column: 1 / -1;
}

.form-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

@media (prefers-color-scheme: dark) {
  .form-hint {
    color: rgba(255, 255, 255, 0.5);
  }
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
