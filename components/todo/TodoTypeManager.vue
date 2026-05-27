<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" :class="{ mobile: isMobile }" @click="$emit('update:visible', false)">
        <div class="modal-content" :class="{ mobile: isMobile }" @click.stop>
          <div class="modal-header">
            <h3>待办类型管理</h3>
            <button class="close-btn" @click="$emit('update:visible', false)" type="button">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
            <template v-if="!editingType">
              <div v-if="todoTypes.length === 0" class="empty-state">
                <Icon name="solar:folder-open-linear" class="empty-icon" />
                <p>还没有创建任何待办类型</p>
                <button class="primary-btn" @click="startCreate" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>创建第一个待办类型</span>
                </button>
              </div>

              <div v-else class="type-list">
                <div
                  v-for="type in sortedTypes"
                  :key="type.id"
                  class="type-card"
                  :style="{ borderLeftColor: type.color }"
                >
                  <div class="type-info">
                    <div class="type-icon" :style="{ background: type.color + '18', color: type.color }">
                      <Icon :name="type.icon" />
                    </div>
                    <div class="type-meta">
                      <div class="type-name">{{ type.name }}</div>
                      <div class="type-desc">{{ type.description || '暂无描述' }}</div>
                    </div>
                  </div>
                  <div class="type-actions">
                    <button
                      class="action-btn"
                      @click="editType(type)"
                      type="button"
                      title="编辑"
                    >
                      <Icon name="solar:pen-2-linear" />
                    </button>
                    <button
                      class="action-btn danger"
                      @click="confirmDeleteType(type)"
                      type="button"
                      title="删除"
                    >
                      <Icon name="solar:trash-bin-trash-linear" />
                    </button>
                  </div>
                </div>

                <button class="create-type-btn" @click="startCreate" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>创建新待办类型</span>
                </button>
              </div>
            </template>

            <template v-else>
              <div class="edit-form">
                <div class="form-group">
                  <label>名称</label>
                  <input v-model="form.name" type="text" class="form-input" placeholder="待办类型名称" />
                </div>

                <div class="form-group">
                  <IconPicker v-model="form.icon" :icons="presetIcons" label="图标" />
                </div>

                <div class="form-group">
                  <label>颜色</label>
                  <div class="color-picker">
                    <button
                      v-for="color in presetColors"
                      :key="color"
                      class="color-option"
                      :class="{ active: form.color === color }"
                      :style="{ background: color }"
                      @click="form.color = color"
                      type="button"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label>描述</label>
                  <input
                    v-model="form.description"
                    type="text"
                    class="form-input"
                    placeholder="可选描述"
                  />
                </div>

                <div class="form-actions">
                  <button class="secondary-btn" @click="cancelEdit" type="button">
                    取消
                  </button>
                  <button class="primary-btn" @click="saveType" type="button">
                    <Icon name="solar:check-circle-linear" />
                    <span>保存</span>
                  </button>
                </div>
              </div>
            </template>
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
  order: number
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'created': [type: TodoType]
  'updated': [type: TodoType]
}>()

const { isMobile } = useDevice()

const todoTypes = ref<TodoType[]>([])
const editingType = ref<TodoType | null>(null)
const form = reactive<{
  name: string
  icon: string
  color: string
  description: string
}>({
  name: '',
  icon: 'solar:check-circle-linear',
  color: '#3b82f6',
  description: ''
})

const presetIcons = [
  'solar:check-circle-linear',
  'solar:star-circle-linear',
  'solar:flag-linear',
  'solar:clock-circle-linear',
  'solar:heart-circle-linear',
  'solar:alert-circle-linear',
  'solar:bolt-circle-linear',
  'solar:calendar-circle-linear',
  'solar:target-linear',
  'solar:document-text-linear'
]

const presetColors = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1'  // indigo
]

const sortedTypes = computed(() => {
  return [...todoTypes.value].sort((a, b) => a.order - b.order)
})

const loadTodoTypes = async () => {
  try {
    const db = await getDB()
    const docs = await db.todo_types.find().exec()
    todoTypes.value = docs.map(doc => doc.toJSON()) as TodoType[]
  } catch (error) {
    console.error('加载待办类型失败:', error)
  }
}

const startCreate = () => {
  editingType.value = null
  form.name = ''
  form.icon = 'solar:check-circle-linear'
  form.color = '#3b82f6'
  form.description = ''
}

const editType = (type: TodoType) => {
  editingType.value = type
  form.name = type.name
  form.icon = type.icon
  form.color = type.color
  form.description = type.description || ''
}

const cancelEdit = () => {
  editingType.value = null
}

const saveType = async () => {
  if (!form.name.trim()) {
    return
  }

  try {
    const db = await getDB()
    
    if (editingType.value) {
      // 更新现有类型
      const type = editingType.value
      await db.todo_types.upsert({
        id: type.id,
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        description: form.description.trim(),
        order: type.order,
        createdAt: type.createdAt,
        updatedAt: now()
      })
      
      const updatedType: TodoType = {
        ...type,
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        description: form.description.trim(),
        updatedAt: now()
      }
      
      emit('updated', updatedType)
    } else {
      // 创建新类型
      const maxOrder = Math.max(0, ...todoTypes.value.map(t => t.order))
      const newType: TodoType = {
        id: generateId(),
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        description: form.description.trim(),
        order: maxOrder + 1,
        createdAt: now(),
        updatedAt: now()
      }
      
      await db.todo_types.insert(newType)
      emit('created', newType)
    }
    
    await loadTodoTypes()
    editingType.value = null
  } catch (error) {
    console.error('保存待办类型失败:', error)
  }
}

const confirmDeleteType = async (type: TodoType) => {
  const confirmed = await useConfirm({
    title: '确认删除',
    message: `确定要删除待办类型"${type.name}"吗？`,
    confirmText: '删除',
    cancelText: '取消'
  })
  
  if (confirmed) {
    try {
      const db = await getDB()
      const doc = await db.todo_types.findOne(type.id).exec()
      if (doc) {
        await doc.remove()
        await loadTodoTypes()
      }
    } catch (error) {
      console.error('删除待办类型失败:', error)
    }
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    loadTodoTypes()
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
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: #d1d5db;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-left: 3px solid;
  border-radius: 12px;
  background: white;
  transition: all 0.2s;
}

.type-card:hover {
  background: #f9fafb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.type-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.type-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.type-meta {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.type-desc {
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.danger {
  color: #ef4444;
}

.action-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.create-type-btn {
  width: 100%;
  padding: 16px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: none;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.create-type-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f0f9ff;
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

.primary-btn:hover {
  background: #2563eb;
}

.secondary-btn {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #f9fafb;
}

.edit-form {
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

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.color-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-option {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #1f2937;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #3b82f6;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.form-actions button {
  flex: 1;
}

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
</style>