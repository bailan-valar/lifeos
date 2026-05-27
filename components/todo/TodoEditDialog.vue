<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="visible" 
        class="modal-overlay" 
        :class="{ mobile: isMobile }" 
        @click="onCancel"
      >
        <div class="modal-content" :class="{ mobile: isMobile }" @click.stop>
          <div class="modal-header">
            <h3>{{ isEditMode ? '编辑待办' : '新建待办' }}</h3>
            <button class="close-btn" @click="onCancel" type="button">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>待办内容 <span class="required">*</span></label>
                <textarea
                  ref="textInput"
                  v-model="form.text"
                  class="content-textarea"
                  rows="3"
                  placeholder="输入待办事项内容..."
                  @keydown.enter.prevent="onConfirm"
                />
              </div>

              <div class="form-group">
                <label>待办类型</label>
                <SelectPicker
                  v-model="form.typeId"
                  :items="typeOptions"
                  placeholder="选择类型（可选）"
                  clearable
                />
              </div>

              <!-- 父任务选择（仅在创建子任务时显示） -->
              <div v-if="showParentSelector" class="form-group">
                <label>父任务</label>
                <SelectPicker
                  v-model="form.parentId"
                  :items="parentTodoOptions"
                  placeholder="选择父任务（可选）"
                  clearable
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="secondary-btn" @click="onCancel" type="button">
              取消
            </button>
            <button
              class="primary-btn"
              @click="onConfirm"
              type="button"
              :disabled="!form.text.trim()"
            >
              <Icon name="solar:check-circle-linear" />
              <span>{{ isEditMode ? '保存' : '创建' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'

interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
}

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
  typeId?: string // 待办类型ID
}

interface Props {
  visible: boolean
  todo?: TodoItem | null
  parentId?: string
  availableParentTodos?: TodoItem[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', todo: TodoItem): void
  (e: 'create', todo: TodoItem): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  todo: null,
  parentId: '',
  availableParentTodos: () => []
})

const emit = defineEmits<Emits>()

const { isMobile } = useDevice()

const todoTypes = ref<TodoType[]>([])
const textInput = ref<HTMLTextAreaElement | null>(null)

const form = reactive<{
  text: string
  typeId: string
  parentId: string
}>({
  text: '',
  typeId: '',
  parentId: ''
})

const isEditMode = computed(() => !!props.todo)

const showParentSelector = computed(() => {
  return !props.parentId && props.availableParentTodos.length > 0
})

const typeOptions = computed(() => {
  return todoTypes.value.map(type => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
    color: type.color
  }))
})

const parentTodoOptions = computed(() => {
  return props.availableParentTodos.map(todo => ({
    value: todo.id,
    label: todo.text,
    disabled: todo.id === props.todo?.id // 不能选择自己作为父任务
  }))
})

// 加载待办类型
const loadTodoTypes = async () => {
  try {
    const db = await getDB()
    const docs = await db.todo_types.find().exec()
    todoTypes.value = docs.map(doc => doc.toJSON()) as TodoType[]
  } catch (error) {
    console.error('加载待办类型失败:', error)
  }
}

// 初始化表单
const initForm = () => {
  if (props.todo) {
    // 编辑模式
    form.text = props.todo.text || ''
    form.typeId = props.todo.typeId || ''
    form.parentId = props.todo.parentId || ''
  } else {
    // 新建模式
    form.text = ''
    form.typeId = ''
    form.parentId = props.parentId || ''
  }
}

// 保存待办
const onConfirm = async () => {
  if (!form.text.trim()) {
    return
  }

  try {
    const db = await getDB()

    if (isEditMode.value && props.todo) {
      // 更新现有待办
      const updatedTodo: TodoItem = {
        ...props.todo,
        text: form.text.trim(),
        typeId: form.typeId || undefined,
        parentId: form.parentId || undefined
      }

      await db.todos.upsert(updatedTodo)
      emit('save', updatedTodo)
    } else {
      // 创建新待办
      const newTodo: TodoItem = {
        id: generateId(),
        text: form.text.trim(),
        completed: false,
        typeId: form.typeId || undefined,
        parentId: form.parentId || undefined,
        createdAt: now()
      }

      await db.todos.insert(newTodo)
      emit('create', newTodo)
    }

    // 关闭对话框
    emit('update:visible', false)
  } catch (error) {
    console.error('保存待办失败:', error)
  }
}

// 取消操作
const onCancel = () => {
  emit('update:visible', false)
}

// 监听visible变化，初始化表单和聚焦
watch(() => props.visible, (visible) => {
  if (visible) {
    loadTodoTypes()
    initForm()
    nextTick(() => {
      textInput.value?.focus()
    })
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-content.mobile {
  max-width: 100%;
  height: 100%;
  border-radius: 0;
  max-height: 100vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group label .required {
  color: #ef4444;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-input,
.content-textarea,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  font-family: inherit;
}

.content-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-input:focus,
.content-textarea:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder,
.content-textarea::placeholder,
.form-textarea::placeholder {
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.secondary-btn {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.secondary-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.primary-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.primary-btn:hover:not(:disabled) {
  background: #2563eb;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 模态框过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s, opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    border-radius: 16px 16px 0 0;
  }
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>