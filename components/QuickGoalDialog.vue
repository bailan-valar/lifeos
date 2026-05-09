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
          <h3>添加目标</h3>
          <button type="button" class="dialog-close" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>

        <div class="dialog-body">
          <div class="form-row">
            <label>目标名称</label>
            <input ref="titleInput" v-model="form.title" type="text" placeholder="输入目标名称..." />
          </div>

          <div class="form-row">
            <label>描述</label>
            <textarea v-model="form.description" rows="3" placeholder="输入目标描述..." />
          </div>

          <div class="form-row inline" :class="{ mobile: isMobile }">
            <div class="form-col">
              <label>状态</label>
              <select v-model="form.status">
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-col">
              <label>类型</label>
              <select v-model="form.type">
                <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="form-col">
              <label>优先级</label>
              <select v-model="form.priority">
                <option v-for="p in priorityOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row inline" :class="{ mobile: isMobile }">
            <div class="form-col">
              <label>计划开始</label>
              <input v-model="form.plannedStartAt" type="datetime-local" />
            </div>
            <div class="form-col">
              <label>截止时间</label>
              <input v-model="form.plannedEndAt" type="datetime-local" />
            </div>
          </div>

          <div class="form-row">
            <label>关联笔记</label>
            <div class="note-selector">
              <div v-for="note in allNotes" :key="note.id" class="note-option">
                <input
                  :id="`qg-note-${note.id}`"
                  type="checkbox"
                  :checked="form.noteIds.includes(note.id)"
                  @change="toggleNote(note.id)"
                />
                <label :for="`qg-note-${note.id}`">{{ note.title || '未命名笔记' }}</label>
              </div>
              <p v-if="allNotes.length === 0" class="note-empty">暂无笔记</p>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-secondary" @click="onCancel">取消</button>
          <button type="button" class="btn-primary" @click="onConfirm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'

interface Goal {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  type: 'short_term' | 'long_term' | 'habit' | 'project'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  plannedStartAt: string
  plannedEndAt: string
  noteIds: string[]
  createdAt: string
  updatedAt: string
}

interface NoteItem {
  id: string
  title: string
}

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { isMobile } = useDevice()
const allNotes = ref<NoteItem[]>([])
const titleInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  title: '',
  description: '',
  status: 'pending' as Goal['status'],
  type: 'short_term' as Goal['type'],
  priority: 'medium' as Goal['priority'],
  plannedStartAt: '',
  plannedEndAt: '',
  noteIds: [] as string[]
})

const statusOptions = [
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const typeOptions = [
  { value: 'short_term', label: '短期' },
  { value: 'long_term', label: '长期' },
  { value: 'habit', label: '习惯' },
  { value: 'project', label: '项目' }
]

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

watch(() => props.visible, async (v) => {
  if (v) {
    form.title = ''
    form.description = ''
    form.status = 'pending'
    form.type = 'short_term'
    form.priority = 'medium'
    form.plannedStartAt = ''
    form.plannedEndAt = ''
    form.noteIds = []
    await loadNotes()
    nextTick(() => titleInput.value?.focus())
  }
})

async function loadNotes() {
  const db = await getDB()
  const result = await db.notes.find().exec()
  allNotes.value = result.map((doc: any) => ({ id: doc.id, title: doc.title }))
}

function toggleNote(noteId: string) {
  const idx = form.noteIds.indexOf(noteId)
  if (idx > -1) {
    form.noteIds.splice(idx, 1)
  } else {
    form.noteIds.push(noteId)
  }
}

function onCancel() {
  emit('cancel')
}

async function onConfirm() {
  const db = await getDB()
  const newGoal: Goal = {
    id: generateId(),
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    type: form.type,
    priority: form.priority,
    plannedStartAt: form.plannedStartAt ? new Date(form.plannedStartAt).toISOString() : '',
    plannedEndAt: form.plannedEndAt ? new Date(form.plannedEndAt).toISOString() : '',
    noteIds: [...form.noteIds],
    createdAt: now(),
    updatedAt: now(),
  }
  await db.goals.insert(newGoal)
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
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  overflow-y: auto;
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
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dialog-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.dialog-body {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
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

.form-row.inline {
  flex-direction: row;
  gap: 12px;
}

.form-row.inline.mobile {
  flex-direction: column;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.form-row label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.65);
}

.form-row input,
.form-row textarea,
.form-row select {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-row input:focus,
.form-row textarea:focus,
.form-row select:focus {
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.note-selector {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.1);
}

.note-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.8);
}

.note-empty {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  margin: 0;
  padding: 4px;
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
</style>
