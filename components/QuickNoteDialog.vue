<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="dialog-overlay"
      :class="{ mobile: isMobile }"
      @click.self="onCancel"
    >
      <div class="dialog-panel" :class="{ mobile: isMobile }">
        <div class="dialog-header">
          <h3>新建笔记</h3>
          <button type="button" class="dialog-close" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>

        <div class="dialog-body">
          <div class="form-row">
            <label>标题</label>
            <input
              ref="titleInput"
              v-model="title"
              type="text"
              placeholder="输入笔记标题..."
              @keydown.enter="onConfirm"
            />
          </div>
          <div class="form-row">
            <label>内容</label>
            <textarea
              v-model="content"
              rows="4"
              placeholder="输入笔记内容..."
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-secondary" @click="onCancel">取消</button>
          <button type="button" class="btn-primary" @click="onConfirm">创建</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { isMobile } = useDevice()
const title = ref('')
const content = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    title.value = ''
    content.value = ''
    nextTick(() => titleInput.value?.focus())
  }
})

function onCancel() {
  emit('cancel')
}

async function onConfirm() {
  const t = title.value.trim() || '新笔记'
  const c = content.value.trim()

  const db = await getDB()
  const noteId = generateId()
  const newNote = {
    id: noteId,
    title: t,
    folderId: '',
    parentId: '',
    order: 0,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
  }
  await db.notes.insert(newNote)

  const newBlock = {
    id: generateId(),
    noteId,
    type: 'text',
    content: c,
    order: 0,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
  }
  await db.blocks.insert(newBlock)

  emit('confirm')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}

.dialog-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}

.dialog-panel {
  width: 480px;
  max-width: 100%;
  max-height: 85vh;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.dialog-panel.mobile {
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
  overflow: hidden;
}

.dialog-body {
  flex: 1;
  min-height: 0;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.dialog-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}


.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  flex-shrink: 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.65);
}

.form-row input,
.form-row textarea {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  resize: vertical;
}

.form-row input:focus,
.form-row textarea:focus {
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.btn-secondary {
  padding: 9px 18px;
  border-radius: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  background: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.75);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.9);
}

.btn-primary {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: rgb(0, 122, 255);
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: rgb(0, 110, 250);
}

.dialog-body::-webkit-scrollbar {
  width: 5px;
}
.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}
.dialog-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}
.dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}
</style>
