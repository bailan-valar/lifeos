<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="$emit('update:visible', false)">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>管理类</h3>
            <button class="close-btn" @click="$emit('update:visible', false)" type="button">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
            <template v-if="!editingClass">
              <div v-if="classes.length === 0" class="empty-state">
                <Icon name="solar:folder-open-linear" class="empty-icon" />
                <p>还没有创建任何类</p>
                <button class="primary-btn" @click="startCreate" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>创建第一个类</span>
                </button>
              </div>

              <div v-else class="class-list">
                <div
                  v-for="cls in classes"
                  :key="cls.id"
                  class="class-card"
                  :style="{ borderLeftColor: cls.color }"
                  @click="editClass(cls)"
                >
                  <div class="class-info">
                    <div class="class-icon" :style="{ background: cls.color + '18', color: cls.color }">
                      <Icon :name="cls.icon" />
                    </div>
                    <div class="class-meta">
                      <div class="class-name">{{ cls.name }}</div>
                      <div class="class-desc">{{ cls.description || '暂无描述' }}</div>
                    </div>
                  </div>
                  <div class="class-actions">
                    <button
                      class="action-btn"
                      @click.stop="editClass(cls)"
                      type="button"
                      title="编辑"
                    >
                      <Icon name="solar:pen-2-linear" />
                    </button>
                    <button
                      class="action-btn danger"
                      @click.stop="confirmDeleteClass(cls)"
                      type="button"
                      title="删除"
                    >
                      <Icon name="solar:trash-bin-trash-linear" />
                    </button>
                  </div>
                </div>

                <button class="create-class-btn" @click="startCreate" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>创建新类</span>
                </button>
              </div>
            </template>

            <template v-else>
              <div class="edit-form">
                <div class="form-group">
                  <label>名称</label>
                  <input v-model="form.name" type="text" class="form-input" placeholder="类名称" />
                </div>

                <div class="form-group">
                  <label>图标</label>
                  <div class="icon-picker">
                    <button
                      v-for="icon in presetIcons"
                      :key="icon"
                      class="icon-option"
                      :class="{ active: form.icon === icon }"
                      @click="form.icon = icon"
                      type="button"
                    >
                      <Icon :name="icon" />
                    </button>
                  </div>
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

                <div class="fields-section">
                  <div class="fields-header">
                    <label>字段</label>
                    <button class="add-field-btn" @click="showAddField = true" type="button">
                      <Icon name="solar:add-circle-linear" />
                      <span>添加字段</span>
                    </button>
                  </div>

                  <div v-if="editingFields.length === 0" class="fields-empty">
                    暂无字段，点击上方添加
                  </div>

                  <div v-else class="fields-list">
                    <div
                      v-for="(field, idx) in editingFields"
                      :key="field.id || field.tempId"
                      class="field-item"
                    >
                      <div class="field-drag">
                        <Icon name="solar:menu-dots-bold" />
                      </div>
                      <div class="field-info">
                        <div class="field-name">{{ field.name }}</div>
                        <div class="field-type">{{ typeLabels[field.type] }}</div>
                        <span v-if="field.required" class="field-required">必填</span>
                      </div>
                      <button
                        class="action-btn danger"
                        @click="removeField(idx)"
                        type="button"
                        title="删除"
                      >
                        <Icon name="solar:trash-bin-trash-linear" />
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="showAddField" class="add-field-form">
                  <div class="form-row">
                    <input
                      v-model="newField.name"
                      type="text"
                      class="form-input"
                      placeholder="字段名称"
                    />
                    <select v-model="newField.type" class="form-input form-select">
                      <option v-for="(label, type) in typeLabels" :key="type" :value="type">
                        {{ label }}
                      </option>
                    </select>
                  </div>
                  <div v-if="newField.type === 'select' || newField.type === 'multiSelect'" class="form-group">
                    <label>选项（用逗号分隔）</label>
                    <input
                      v-model="optionsInput"
                      type="text"
                      class="form-input"
                      placeholder="选项1, 选项2, 选项3"
                    />
                  </div>
                  <div class="form-row">
                    <label class="checkbox-label">
                      <input v-model="newField.required" type="checkbox" />
                      <span>必填</span>
                    </label>
                    <div class="form-actions">
                      <button class="btn-text" @click="cancelAddField" type="button">取消</button>
                      <button class="btn-primary" @click="addField" type="button">添加</button>
                    </div>
                  </div>
                </div>

                <div class="form-footer">
                  <button class="btn-text" @click="cancelEdit" type="button">返回</button>
                  <button class="btn-primary" @click="saveClass" type="button">
                    {{ isCreating ? '创建' : '保存' }}
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
import type { Class, ClassField, ClassFieldType } from '~/types/block'
import { generateId } from '~/services/db'
import { useConfirm } from '~/composables/useConfirm'
import { useZIndexOnOpen } from '~/composables/useZIndex'

interface Props {
  visible: boolean
  userId: string
}

const props = defineProps<Props>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'created', classId: string): void
}>()

const {
  classes,
  loadClasses,
  createClass,
  updateClass,
  deleteClass,
  createField,
  deleteField
} = useNoteClasses()

const editingClass = ref<Class | null>(null)
const isCreating = ref(false)
const showAddField = ref(false)
const editingFields = ref<(ClassField & { tempId?: string })[]>([])

const form = reactive({
  name: '',
  icon: 'solar:document-text-linear',
  color: '#007AFF',
  description: ''
})

const newField = reactive({
  name: '',
  type: 'text' as ClassFieldType,
  required: false
})

const optionsInput = ref('')

const typeLabels: Record<string, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '单选',
  multiSelect: '多选',
  checkbox: '开关',
  url: '链接',
  email: '邮箱'
}

const presetIcons = [
  'solar:document-text-linear',
  'solar:folder-linear',
  'solar:user-linear',
  'solar:buildings-linear',
  'solar:book-linear',
  'solar:calendar-linear',
  'solar:tag-linear',
  'solar:star-linear',
  'solar:heart-linear',
  'solar:bolt-linear',
  'solar:code-linear',
  'solar:gallery-wide-linear'
]

const presetColors = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
  '#8E8E93'
]

onMounted(() => {
  loadClasses(props.userId)
})

watch(() => props.visible, (v) => {
  if (v) {
    loadClasses(props.userId)
  } else {
    editingClass.value = null
    isCreating.value = false
    showAddField.value = false
    editingFields.value = []
  }
})

const startCreate = () => {
  isCreating.value = true
  editingClass.value = {
    id: '',
    userId: props.userId,
    name: '',
    icon: 'solar:document-text-linear',
    color: '#007AFF',
    description: '',
    order: 0,
    createdAt: '',
    updatedAt: '',
    isSynced: false
  }
  form.name = ''
  form.icon = 'solar:document-text-linear'
  form.color = '#007AFF'
  form.description = ''
  editingFields.value = []
}

const editClass = (cls: Class) => {
  isCreating.value = false
  editingClass.value = cls
  form.name = cls.name
  form.icon = cls.icon
  form.color = cls.color
  form.description = cls.description

  const { loadFields } = useNoteClasses()
  loadFields(cls.id).then(fields => {
    editingFields.value = [...fields]
  })
}

defineExpose({
  startCreate,
  editClass
})

const cancelEdit = () => {
  editingClass.value = null
  isCreating.value = false
  showAddField.value = false
  editingFields.value = []
}

const saveClass = async () => {
  if (!form.name.trim()) return

  let createdClassId: string | null = null

  if (isCreating.value) {
    const cls = await createClass({
      userId: props.userId,
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      description: form.description.trim()
    })
    createdClassId = cls.id
    for (const field of editingFields.value) {
      await createField(cls.id, {
        name: field.name,
        type: field.type,
        options: field.options,
        required: field.required
      })
    }
  } else if (editingClass.value) {
    await updateClass(editingClass.value.id, {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      description: form.description.trim()
    })
    for (const field of editingFields.value) {
      if (!field.id) {
        await createField(editingClass.value.id, {
          name: field.name,
          type: field.type,
          options: field.options,
          required: field.required
        })
      }
    }
  }

  editingClass.value = null
  isCreating.value = false
  showAddField.value = false
  editingFields.value = []
  await loadClasses(props.userId)

  if (createdClassId) {
    emit('created', createdClassId)
    emit('update:visible', false)
  }
}

const { confirm } = useConfirm()

const confirmDeleteClass = async (cls: Class) => {
  if (!await confirm(`确定删除类「${cls.name}」？关联的笔记属性也会被移除。`)) return
  await deleteClass(cls.id)
  await loadClasses(props.userId)
}

const addField = () => {
  if (!newField.name.trim()) return
  const options = optionsInput.value
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
  editingFields.value.push({
    id: '',
    classId: editingClass.value?.id || '',
    name: newField.name.trim(),
    type: newField.type,
    options,
    required: newField.required,
    order: editingFields.value.length,
    createdAt: '',
    updatedAt: '',
    isSynced: false,
    tempId: generateId()
  })
  cancelAddField()
}

const removeField = async (idx: number) => {
  const field = editingFields.value[idx]
  if (field.id) {
    await deleteField(field.id)
  }
  editingFields.value.splice(idx, 1)
}

const cancelAddField = () => {
  showAddField.value = false
  newField.name = ''
  newField.type = 'text'
  newField.required = false
  optionsInput.value = ''
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.modal-content {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  margin: 20px;
  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 20px;
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s ease, color 0.15s ease;
}

.close-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.85);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  color: rgba(60, 60, 67, 0.3);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.55);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
  transition: transform 0.15s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
}

.class-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.class-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  border: 0.5px solid rgba(60, 60, 67, 0.08);
  border-left: 3px solid;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.class-card:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateY(-1px);
}

.class-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.class-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
}

.class-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.class-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.class-desc {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.class-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.class-card:hover .class-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s ease, color 0.15s ease;
}

.action-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.85);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.create-class-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(60, 60, 67, 0.2);
  border-radius: 14px;
  color: rgba(0, 122, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.create-class-btn:hover {
  background: rgba(0, 122, 255, 0.06);
  border-color: rgba(0, 122, 255, 0.3);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.form-input:focus {
  border-color: rgba(0, 122, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23606067' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.icon-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.7);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-option:hover {
  background: rgba(0, 122, 255, 0.08);
}

.icon-option.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 102, 230);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-option {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
}

.fields-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fields-header label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
}

.add-field-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.add-field-btn:hover {
  background: rgba(0, 122, 255, 0.18);
}

.fields-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.4);
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}

.fields-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.08);
}

.field-drag {
  color: rgba(60, 60, 67, 0.25);
  font-size: 14px;
  cursor: grab;
}

.field-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.9);
}

.field-type {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
  background: rgba(60, 60, 67, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
}

.field-required {
  font-size: 11px;
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}

.add-field-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 0.5px solid rgba(0, 122, 255, 0.2);
}

.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-row .form-input {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.8);
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.btn-text {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-text:hover {
  background: rgba(60, 60, 67, 0.06);
}

.btn-primary {
  padding: 8px 18px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
  transition: transform 0.1s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: scale(0.97);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
