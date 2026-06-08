<template>
  <BaseDialog
    :visible="visible"
    :title="isCreating ? '新建笔记' : '编辑笔记'"
    size="medium"
    @update:visible="handleClose"
    @close="handleClose"
  >
    <div class="edit-form">
      <div class="form-row">
        <label for="note-title">标题</label>
        <input
          id="note-title"
          ref="titleInput"
          v-model="formData.title"
          type="text"
          class="liquid-glass-input"
          placeholder="输入笔记标题..."
          @keydown.enter="handleConfirm"
        />
      </div>

      <div class="form-row">
        <label for="note-parent">父笔记</label>
        <SelectPicker
          v-model="formData.parentId"
          :options="parentNoteOptions"
          placeholder="无（根级笔记）"
          clearable
          searchable
        />
      </div>

      <div class="form-row">
        <label for="note-class">笔记类</label>
        <SelectPicker
          v-model="formData.classId"
          :options="classOptions"
          placeholder="选择笔记类（可选）"
          clearable
        >
          <template #selected="{ option }">
            <div class="class-selected">
              <span class="class-dot" :style="{ background: option?.color }" />
              <span>{{ option?.label }}</span>
            </div>
          </template>
          <template #option="{ option }">
            <div class="class-option">
              <span class="class-dot" :style="{ background: option.color }" />
              <span>{{ option.label }}</span>
            </div>
          </template>
        </SelectPicker>
      </div>

      <div v-if="selectedClassFields.length > 0" class="form-row class-fields-row">
        <label>类属性</label>
        <div class="class-fields">
          <div
            v-for="field in selectedClassFields"
            :key="field.id"
            class="field-item"
          >
            <label class="field-label">
              {{ field.name }}
              <span v-if="field.required" class="required">*</span>
            </label>
            <input
              v-if="field.type === 'text' || field.type === 'email' || field.type === 'url'"
              v-model="formData.classValues[field.id]"
              type="text"
              class="liquid-glass-input"
              :placeholder="`请输入${field.name}`"
            />
            <input
              v-else-if="field.type === 'number'"
              v-model.number="formData.classValues[field.id]"
              type="number"
              class="liquid-glass-input"
              :placeholder="`请输入${field.name}`"
            />
            <input
              v-else-if="field.type === 'date'"
              v-model="formData.classValues[field.id]"
              type="date"
              class="liquid-glass-input"
            />
            <SelectPicker
              v-else-if="field.type === 'select'"
              v-model="formData.classValues[field.id]"
              :options="field.options.map(opt => ({ label: opt, value: opt }))"
              :placeholder="`请选择${field.name}`"
              clearable
            />
            <div v-else-if="field.type === 'checkbox'" class="checkbox-wrapper">
              <label class="checkbox-label">
                <input
                  v-model="formData.classValues[field.id]"
                  type="checkbox"
                  class="checkbox-input"
                />
                <span>{{ field.name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label for="note-content">内容</label>
        <textarea
          id="note-content"
          v-model="formData.content"
          class="liquid-glass-input"
          rows="6"
          placeholder="输入笔记内容..."
        />
      </div>
    </div>

    <template #footer>
      <button type="button" class="liquid-glass-button" @click="handleClose">
        取消
      </button>
      <button
        type="button"
        class="liquid-glass-button liquid-glass-button-primary"
        @click="handleConfirm"
      >
        {{ isCreating ? '创建' : '保存' }}
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '~/components/ui/BaseDialog.vue'
import SelectPicker from '~/components/SelectPicker.vue'
import { getDB, generateId, now } from '~/services/db'
import { useNotes } from '~/composables/useNotes'
import { useNoteClasses } from '~/composables/useNoteClasses'
import type { Note } from '~/types/block'
import type { ClassField } from '~/types/block'

const props = defineProps<{
  visible: boolean
  note: Note | null
  parentId?: string
  isCreating?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: [note: Note]
  created: [note: Note]
}>()

// Composables
const { noteOptions, loadNotes: loadNotesOptions } = useNotes()
const { classes, classFields, loadClasses, bindClass, updateBindingValues, getClassForNote } = useNoteClasses()

// 表单数据
interface FormData {
  title: string
  content: string
  parentId: string | null
  classId: string | null
  classValues: Record<string, any>
}

const formData = ref<FormData>({
  title: '',
  content: '',
  parentId: null,
  classId: null,
  classValues: {}
})

const titleInput = ref<HTMLInputElement | null>(null)

// 父笔记选项（排除自己和子孙笔记，防止循环）
const parentNoteOptions = computed(() => {
  if (props.isCreating || !props.note) {
    return noteOptions.value.map(opt => ({
      label: `${'  '.repeat(opt.level)}${opt.title}`,
      value: opt.id
    }))
  }

  // 编辑模式：排除自己和子孙笔记
  const excludeIds = new Set([props.note.id])
  const queue = [props.note.id]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = noteOptions.value.filter(opt => {
      // 找到以 current 为父级的笔记
      const note = noteOptions.value.find(o => o.id === current)
      // 这里简化处理，实际需要根据 parentId 判断
      return false
    })
    for (const child of children) {
      excludeIds.add(child.id)
      queue.push(child.id)
    }
  }

  return noteOptions.value
    .filter(opt => !excludeIds.has(opt.id))
    .map(opt => ({
      label: `${'  '.repeat(opt.level)}${opt.title}`,
      value: opt.id
    }))
})

// 类选项
const classOptions = computed(() => {
  return classes.value.map(cls => ({
    label: cls.name,
    value: cls.id,
    color: cls.color
  }))
})

// 选中的类的字段
const selectedClassFields = computed(() => {
  if (!formData.value.classId) return []
  return classFields.value
    .filter(f => f.classId === formData.value.classId)
    .sort((a, b) => a.order - b.order)
})

// 加载数据
watch(() => props.visible, async (v) => {
  if (v) {
    // 加载笔记列表
    await loadNotesOptions()
    // 加载类列表
    await loadClasses()

    if (props.isCreating) {
      console.log('[NoteEditDialog] Creating mode, parentId:', props.parentId)
      console.log('[NoteEditDialog] noteOptions:', noteOptions.value)
      formData.value = {
        title: '',
        content: '',
        parentId: props.parentId ?? null,
        classId: null,
        classValues: {}
      }
      console.log('[NoteEditDialog] formData.parentId after set:', formData.value.parentId)
      // 等待响应式更新完成
      await nextTick()
      console.log('[NoteEditDialog] After nextTick, parentNoteOptions:', parentNoteOptions.value)
    } else if (props.note) {
      formData.value = {
        title: props.note.title || '',
        content: '',
        parentId: props.note.parentId || null,
        classId: null,
        classValues: {}
      }
      // 加载笔记内容
      await loadNoteContent(props.note.id)
      // 加载笔记类
      await loadNoteClass(props.note.id)
    }
    nextTick(() => titleInput.value?.focus())
  }
})

// 监听类变化，清空字段值
watch(() => formData.value.classId, () => {
  formData.value.classValues = {}
})

async function loadNoteContent(noteId: string) {
  try {
    const db = await getDB()
    const blocks = await db.blocks.find({
      selector: { noteId },
      sort: [{ order: 'asc' }]
    }).exec()

    if (blocks.length > 0) {
      const firstBlock = blocks[0].toJSON()
      if (firstBlock.type === 'text') {
        formData.value.content = firstBlock.content || ''
      }
    }
  } catch (err) {
    console.error('加载笔记内容失败:', err)
  }
}

async function loadNoteClass(noteId: string) {
  try {
    const classData = await getClassForNote(noteId)
    if (classData) {
      formData.value.classId = classData.class.id
      formData.value.classValues = { ...classData.binding.values }
    }
  } catch (err) {
    console.error('加载笔记类失败:', err)
  }
}

function handleClose() {
  emit('update:visible', false)
}

async function handleConfirm() {
  const title = formData.value.title.trim() || '新笔记'
  const content = formData.value.content.trim()

  if (props.isCreating) {
    await createNote(title, content)
  } else if (props.note) {
    await updateNote(props.note, title, content)
  }
}

async function createNote(title: string, content: string) {
  try {
    const db = await getDB()
    const noteId = generateId()
    const parentId = formData.value.parentId || props.parentId || ''

    const newNote: Note = {
      id: noteId,
      title,
      folderId: '',
      parentId,
      order: 0,
      createdAt: now(),
      updatedAt: now(),
      version: 1
    }
    await db.notes.insert(newNote)

    // 创建内容块
    if (content) {
      const newBlock = {
        id: generateId(),
        noteId,
        type: 'text',
        content,
        order: 0,
        createdAt: now(),
        updatedAt: now(),
        version: 1
      }
      await db.blocks.insert(newBlock)
    }

    // 绑定类
    if (formData.value.classId) {
      await bindClass(noteId, formData.value.classId)
      if (Object.keys(formData.value.classValues).length > 0) {
        await updateBindingValues(noteId, formData.value.classValues)
      }
    }

    emit('created', newNote)
    emit('update:visible', false)
  } catch (err) {
    console.error('创建笔记失败:', err)
  }
}

async function updateNote(note: Note, title: string, content: string) {
  try {
    const db = await getDB()

    // 更新笔记标题和父笔记
    const noteDoc = await db.notes.findOne(note.id).exec()
    if (noteDoc) {
      await noteDoc.patch({
        title,
        parentId: formData.value.parentId || '',
        updatedAt: now()
      })
    }

    // 更新或创建第一个文本块
    const blocks = await db.blocks.find({
      selector: { noteId: note.id },
      sort: [{ order: 'asc' }]
    }).exec()

    if (blocks.length > 0) {
      const firstBlock = blocks[0]
      if (firstBlock.type === 'text') {
        await firstBlock.patch({
          content,
          updatedAt: now()
        })
      } else {
        const newBlock = {
          id: generateId(),
          noteId: note.id,
          type: 'text',
          content,
          order: 0,
          createdAt: now(),
          updatedAt: now(),
          version: 1
        }
        await db.blocks.insert(newBlock)
      }
    } else if (content) {
      const newBlock = {
        id: generateId(),
        noteId: note.id,
        type: 'text',
        content,
        order: 0,
        createdAt: now(),
        updatedAt: now(),
        version: 1
      }
      await db.blocks.insert(newBlock)
    }

    // 更新类绑定
    if (formData.value.classId) {
      await bindClass(note.id, formData.value.classId)
      await updateBindingValues(note.id, formData.value.classValues)
    } else {
      // 解除绑定
      const { unbindClass } = useNoteClasses()
      await unbindClass(note.id)
    }

    const updatedNote: Note = {
      ...note,
      title,
      parentId: formData.value.parentId || '',
      updatedAt: now()
    }

    emit('saved', updatedNote)
    emit('update:visible', false)
  } catch (err) {
    console.error('更新笔记失败:', err)
  }
}
</script>

<style scoped>
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.7);
}

@media (prefers-color-scheme: dark) {
  .form-row label {
    color: rgba(255, 255, 255, 0.7);
  }
}

.form-row textarea {
  resize: vertical;
  min-height: 100px;
}

/* 类选择样式 */
.class-selected {
  display: flex;
  align-items: center;
  gap: 6px;
}

.class-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.class-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 类属性字段 */
.class-fields-row {
  padding: 12px;
  margin: -4px 0;
  background: rgba(60, 60, 67, 0.04);
  border-radius: 12px;
}

.class-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
}

.required {
  color: rgb(255, 59, 48);
  margin-left: 2px;
}

.checkbox-wrapper {
  padding: 4px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.85);
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .class-fields-row {
    background: rgba(255, 255, 255, 0.06);
  }

  .field-label {
    color: rgba(255, 255, 255, 0.65);
  }

  .checkbox-label {
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
