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
import { getDB, generateId, now } from '~/services/db'
import type { Note } from '~/types/block'

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

const formData = ref({
  title: '',
  content: ''
})

const titleInput = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    if (props.isCreating) {
      formData.value = { title: '', content: '' }
    } else if (props.note) {
      formData.value = {
        title: props.note.title || '',
        content: ''
      }
      // 加载第一个块的内容作为默认内容
      loadNoteContent(props.note.id)
    }
    nextTick(() => titleInput.value?.focus())
  }
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
    const newNote: Note = {
      id: noteId,
      title,
      folderId: '',
      parentId: props.parentId || '',
      order: 0,
      createdAt: now(),
      updatedAt: now(),
      version: 1
    }
    await db.notes.insert(newNote)

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

    emit('created', newNote)
    emit('update:visible', false)
  } catch (err) {
    console.error('创建笔记失败:', err)
  }
}

async function updateNote(note: Note, title: string, content: string) {
  try {
    const db = await getDB()

    // 更新笔记标题
    const noteDoc = await db.notes.findOne(note.id).exec()
    if (noteDoc) {
      await noteDoc.patch({
        title,
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
        // 第一个块不是文本，插入新块
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
      // 没有块，创建新块
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

    const updatedNote: Note = {
      ...note,
      title,
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
</style>
