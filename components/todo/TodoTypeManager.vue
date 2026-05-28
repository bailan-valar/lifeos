<template>
  <BaseDialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    title="待办类型管理"
    size="medium"
  >
    <!-- 列表视图 -->
    <div v-if="editingType === null">
      <div v-if="todoTypes.length === 0" class="empty-state">
        <Icon :name="ICONS.folderOpen || 'solar:folder-open-linear'" size="48" />
        <p>还没有创建任何待办类型</p>
        <button class="liquid-glass-button liquid-glass-button-primary" type="button" @click="startCreate">
          <Icon :name="SOLAR_ICONS.action.add || 'solar:add-circle-linear'" size="18" />
          <span>创建第一个待办类型</span>
        </button>
      </div>

      <div v-else class="type-list">
        <div
          v-for="type in sortedTypes"
          :key="type.id"
          class="type-card liquid-glass-card"
          :style="{ borderLeftColor: type.color }"
        >
          <div class="type-info">
            <div class="type-icon" :style="{ background: type.color + '18', color: type.color }">
              <Icon :name="type.icon || 'solar:folder-linear'" size="20" />
            </div>
            <div class="type-meta">
              <div class="type-name">{{ type.name }}</div>
              <div class="type-desc">{{ type.description || '暂无描述' }}</div>
            </div>
          </div>
          <div class="type-actions">
            <button
              class="liquid-glass-button icon-btn"
              @click="editType(type)"
              type="button"
              title="编辑"
            >
              <Icon :name="SOLAR_ICONS.action.edit || 'solar:pen-linear'" size="16" />
            </button>
            <button
              class="liquid-glass-button icon-btn danger"
              @click="confirmDeleteType(type)"
              type="button"
              title="删除"
            >
              <Icon :name="SOLAR_ICONS.action.delete || 'solar:trash-bin-trash-linear'" size="16" />
            </button>
          </div>
        </div>

        <button class="create-type-btn liquid-glass" type="button" @click="startCreate">
          <Icon :name="SOLAR_ICONS.action.add || 'solar:add-circle-linear'" size="18" />
          <span>创建新待办类型</span>
        </button>
      </div>
    </div>

    <!-- 编辑表单 -->
    <div v-else class="edit-form">
      <div class="form-group">
        <label>名称</label>
        <input v-model="form.name" type="text" class="liquid-glass-input" placeholder="待办类型名称" />
      </div>

      <div class="form-group">
        <label>图标</label>
        <div class="icon-grid">
          <button
            v-for="icon in presetIcons"
            :key="icon"
            type="button"
            class="icon-option"
            :class="{ active: form.icon === icon }"
            @click="form.icon = icon"
          >
            <Icon :name="icon" size="20" />
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>颜色</label>
        <div class="color-picker">
          <button
            v-for="color in presetColors"
            :key="color"
            type="button"
            class="color-option"
            :class="{ active: form.color === color }"
            :style="{ background: color }"
            @click="form.color = color"
          />
        </div>
      </div>

      <div class="form-group">
        <label>描述</label>
        <input
          v-model="form.description"
          type="text"
          class="liquid-glass-input"
          placeholder="可选描述"
        />
      </div>
    </div>

    <!-- 编辑模式下的底部按钮 -->
    <template v-if="editingType" #footer>
      <button class="liquid-glass-button" @click="cancelEdit" type="button">
        取消
      </button>
      <button class="liquid-glass-button liquid-glass-button-primary" type="button" @click="saveType">
        <Icon :name="SOLAR_ICONS.action.save || 'solar:check-circle-linear'" size="16" />
        <span>保存</span>
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'
import { SOLAR_ICONS, ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'

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
  'solar:document-text-linear',
  'solar:briefcase-linear',
  'solar:home-smile-linear',
  'solar:shop-linear',
  'solar:health-linear',
  'solar:graduation-cap-linear'
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
  editingType.value = undefined
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
  const { confirm } = useConfirm()
  const confirmed = await confirm({
    title: '确认删除',
    message: `确定要删除待办类型"${type.name}"吗？`,
    confirmText: '删除',
    cancelText: '取消',
    danger: true
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
  } else {
    editingType.value = null
  }
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--liquid-text-secondary, rgba(60, 60, 67, 0.55));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
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
  border-left: 3px solid;
  transition: all 0.15s ease;
}

.type-card:hover {
  background: var(--liquid-bg-thick);
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
  border-radius: var(--liquid-radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-meta {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-weight: 600;
  color: var(--liquid-text-primary, rgba(0, 0, 0, 0.92));
  margin-bottom: 2px;
}

.type-desc {
  font-size: 13px;
  color: var(--liquid-text-secondary, rgba(60, 60, 67, 0.55));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.danger {
  color: #ef4444;
}

.icon-btn.danger:hover {
  color: #dc2626;
}

.create-type-btn {
  width: 100%;
  padding: 16px;
  border: 2px dashed var(--liquid-border, rgba(60, 60, 67, 0.15));
  border-radius: var(--liquid-radius);
  color: var(--liquid-text-secondary, rgba(60, 60, 67, 0.55));
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.create-type-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
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
  color: var(--liquid-text-primary, rgba(0, 0, 0, 0.92));
  font-size: 14px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.icon-option {
  width: 44px;
  height: 44px;
  border-radius: var(--liquid-radius-button);
  border: 2px solid var(--liquid-border, rgba(60, 60, 67, 0.15));
  background: var(--liquid-bg);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--liquid-text-primary, rgba(0, 0, 0, 0.7));
}

.icon-option:hover {
  background: var(--liquid-bg-thick);
  border-color: #3b82f6;
}

.icon-option.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.color-picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-option {
  width: 36px;
  height: 36px;
  border-radius: var(--liquid-radius-button);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 2px white, 0 0 0 4px #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .color-option.active {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .type-name {
    color: var(--liquid-text-primary, rgba(255, 255, 255, 0.92));
  }

  .type-desc {
    color: var(--liquid-text-secondary, rgba(255, 255, 255, 0.55));
  }

  .form-group label {
    color: var(--liquid-text-primary, rgba(255, 255, 255, 0.92));
  }

  .icon-option {
    color: var(--liquid-text-primary, rgba(255, 255, 255, 0.7));
  }

  .create-type-btn {
    color: var(--liquid-text-secondary, rgba(255, 255, 255, 0.55));
    border-color: var(--liquid-border, rgba(255, 255, 255, 0.15));
  }

  .create-type-btn:hover {
    background: rgba(59, 130, 246, 0.15);
  }
}
</style>
