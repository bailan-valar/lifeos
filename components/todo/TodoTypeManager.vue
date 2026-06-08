<template>
  <BaseDialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    title="待办类型管理"
    size="medium"
  >
    <!-- 空状态 -->
    <div v-if="todoTypes.length === 0" class="empty-state">
      <Icon :name="ICONS.folderOpen" size="48" />
      <p>还没有创建任何待办类型</p>
      <button class="liquid-glass-button liquid-glass-button-primary" type="button" @click="startCreate">
        <Icon :name="SOLAR_ICONS.action.add" size="18" />
        <span>创建第一个待办类型</span>
      </button>
    </div>

    <!-- 类型列表 -->
    <div v-else class="type-list">
      <div
        v-for="type in sortedTypes"
        :key="type.id"
        class="type-card liquid-glass-card"
        :style="{ borderLeftColor: type.color }"
      >
        <div class="type-info">
          <div class="type-icon" :style="{ background: type.color + '18', color: type.color }">
            <Icon :name="type.icon" size="20" />
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
            <Icon :name="SOLAR_ICONS.action.edit" size="16" />
          </button>
          <button
            class="liquid-glass-button icon-btn danger"
            @click="confirmDeleteType(type)"
            type="button"
            title="删除"
          >
            <Icon :name="SOLAR_ICONS.action.delete" size="16" />
          </button>
        </div>
      </div>

      <button class="create-type-btn liquid-glass" type="button" @click="startCreate">
        <Icon :name="SOLAR_ICONS.action.add" size="18" />
        <span>创建新待办类型</span>
      </button>
    </div>

    <!-- 编辑弹窗 -->
    <TodoTypeEditDialog
      v-model:visible="showEditDialog"
      :edit-type="editingType"
      @save="onTypeSave"
    />
  </BaseDialog>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import { useConfirm } from '~/composables/useConfirm'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import TodoTypeEditDialog from './TodoTypeEditDialog.vue'

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

const { confirm } = useConfirm()

const todoTypes = ref<TodoType[]>([])
const showEditDialog = ref(false)
const editingType = ref<TodoType | null>(null)

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
  showEditDialog.value = true
}

const editType = (type: TodoType) => {
  editingType.value = type
  showEditDialog.value = true
}

const onTypeSave = async (typeData: TodoType & { id?: string }) => {
  try {
    const db = await getDB()

    if (typeData.id) {
      // 编辑现有类型
      const type = todoTypes.value.find(t => t.id === typeData.id)
      if (type) {
        await db.todo_types.upsert({
          id: type.id,
          name: typeData.name,
          icon: typeData.icon,
          color: typeData.color,
          description: typeData.description,
          order: type.order,
          createdAt: type.createdAt,
          updatedAt: now()
        })

        emit('updated', {
          ...type,
          ...typeData,
          updatedAt: now()
        } as TodoType)
      }
    } else {
      // 创建新类型
      const maxOrder = Math.max(0, ...todoTypes.value.map(t => t.order))
      const newType: TodoType = {
        id: generateId(),
        name: typeData.name,
        icon: typeData.icon,
        color: typeData.color,
        description: typeData.description,
        order: maxOrder + 1,
        createdAt: now(),
        updatedAt: now()
      }

      await db.todo_types.insert(newType)
      emit('created', newType)
    }

    await loadTodoTypes()
  } catch (error) {
    console.error('保存待办类型失败:', error)
  }
}

const confirmDeleteType = async (type: TodoType) => {
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

@media (prefers-color-scheme: dark) {
  .type-name {
    color: var(--liquid-text-primary, rgba(255, 255, 255, 0.92));
  }

  .type-desc {
    color: var(--liquid-text-secondary, rgba(255, 255, 255, 0.55));
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
