<template>
  <div class="notes-page">
    <div class="notes-bg">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
      <div class="bg-grain" />
    </div>

    <div class="notes-container">
      <aside class="notes-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <NoteList
          :notes="notes"
          :active-note-id="activeNoteId"
          @select="selectNote"
          @create="createNote"
          @create-child="createChildNote"
          @reorder="handleReorder"
          @delete="deleteNote"
        />
      </aside>

      <div class="sidebar-toggle" :class="{ collapsed: sidebarCollapsed }" @click="sidebarCollapsed = !sidebarCollapsed">
        <Icon :name="sidebarCollapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-left-linear'" />
      </div>

      <main class="notes-main">
        <div v-if="activeNoteId" class="editor-shell">
          <NoteViewSwitcher :note-id="activeNoteId" @title-update="onTitleUpdate" @open-class-manager="openClassManager" />
        </div>

        <div v-else class="empty-state">
          <div class="empty-content">
            <div class="empty-icon-wrap">
              <Icon name="solar:document-text-linear" class="empty-icon" />
            </div>
            <h2>选择一个笔记开始编辑</h2>
            <p>或者创建一个新笔记开启你的灵感之旅</p>
            <button class="create-btn" @click="createNote" type="button">
              <Icon name="solar:add-circle-linear" />
              <span>创建新笔记</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'
import type { Note, Block } from '~/types/block'
import NoteList from '~/components/NoteList.vue'
import NoteViewSwitcher from '~/components/NoteViewSwitcher.vue'

const notes = ref<Note[]>([])
const activeNoteId = ref<string | null>(null)
const userId = ref('default-user')
const sidebarCollapsed = ref(false)
const classManagerVisible = inject<Ref<boolean>>('classManagerVisible', ref(false))

const openClassManager = () => {
  classManagerVisible.value = true
}

const route = useRoute()

onMounted(async () => {
  console.log('[Notes] Component mounted, initializing database...')
  await loadNotes()

  const noteIdFromQuery = route.query.note as string
  if (noteIdFromQuery) {
    activeNoteId.value = noteIdFromQuery
  }
})

const loadNotes = async () => {
  const db = await getDB()

  console.log('[Notes] Loading notes for userId:', userId.value)
  const result = await db.notes
    .find({
      selector: { userId: userId.value },
      sort: [{ updatedAt: 'desc' }]
    })
    .exec()

  console.log('[Notes] Found', result.length, 'notes')
  notes.value = result.map((doc: any) => doc.toJSON())
}

const selectNote = async (noteId: string) => {
  activeNoteId.value = noteId
}

const onTitleUpdate = (noteId: string, title: string) => {
  const idx = notes.value.findIndex(n => n.id === noteId)
  if (idx === -1) return
  notes.value[idx] = { ...notes.value[idx], title, updatedAt: now() }
}

const createNote = async () => {
  const db = await getDB()

  console.log('[Notes] Creating new note...')
  const rootSiblings = notes.value.filter(n => !n.parentId)
  const newNote: Note = {
    id: generateId(),
    userId: userId.value,
    title: '新笔记',
    folderId: '',
    parentId: '',
    order: rootSiblings.length,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
    isSynced: false
  }

  console.log('[Notes] New note object:', JSON.stringify(newNote, null, 2))
  console.log('[Notes] Attempting to insert note...')
  try {
    await db.notes.insert(newNote)
    console.log('[Notes] Note inserted successfully')
  } catch (error) {
    console.error('[Notes] Error inserting note:', error)
    console.error('[Notes] Error stack:', error instanceof Error ? error.stack : 'No stack')
    throw error
  }

  console.log('[Notes] Creating initial block for note...')
  const newBlock: Block = {
    id: generateId(),
    noteId: newNote.id,
    type: 'text',
    content: '',
    order: 0,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
    isSynced: false
  }

  console.log('[Notes] New block object:', JSON.stringify(newBlock, null, 2))
  console.log('[Notes] Attempting to insert block...')
  try {
    await db.blocks.insert(newBlock)
    console.log('[Notes] Block inserted successfully')
  } catch (error) {
    console.error('[Notes] Error inserting block:', error)
    console.error('[Notes] Error stack:', error instanceof Error ? error.stack : 'No stack')
    throw error
  }

  await loadNotes()
  activeNoteId.value = newNote.id
}

const createChildNote = async (parentId: string) => {
  const db = await getDB()
  const childSiblings = notes.value.filter(n => n.parentId === parentId)
  const newNote: Note = {
    id: generateId(),
    userId: userId.value,
    title: '新笔记',
    folderId: '',
    parentId,
    order: childSiblings.length,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
    isSynced: false
  }
  await db.notes.insert(newNote)

  const newBlock: Block = {
    id: generateId(),
    noteId: newNote.id,
    type: 'text',
    content: '',
    order: 0,
    createdAt: now(),
    updatedAt: now(),
    version: 1,
    isSynced: false
  }
  await db.blocks.insert(newBlock)

  await loadNotes()
  activeNoteId.value = newNote.id
}

const deleteNote = async (noteId: string) => {
  const db = await getDB()

  const idsToDelete = new Set<string>([noteId])
  const collectDescendants = (parentId: string) => {
    for (const note of notes.value) {
      if (note.parentId === parentId) {
        idsToDelete.add(note.id)
        collectDescendants(note.id)
      }
    }
  }
  collectDescendants(noteId)

  for (const id of idsToDelete) {
    const doc = await db.notes.findOne(id).exec()
    if (doc) await doc.remove()
  }

  const allBlocks = await db.blocks.find().exec()
  for (const block of allBlocks) {
    if (idsToDelete.has(block.noteId)) {
      await block.remove()
    }
  }

  if (activeNoteId.value && idsToDelete.has(activeNoteId.value)) {
    activeNoteId.value = null
  }

  await loadNotes()
}

const handleReorder = async (payload: {
  id: string
  targetId: string | null
  position: 'before' | 'after' | 'child' | 'root-end'
}) => {
  const db = await getDB()
  const moved = notes.value.find(n => n.id === payload.id)
  if (!moved) return

  let newParentId = ''
  let insertIndex = 0

  if (payload.position === 'root-end') {
    newParentId = ''
    insertIndex = notes.value.filter(n => !n.parentId && n.id !== payload.id).length
  } else if (payload.position === 'child') {
    if (!payload.targetId) return
    newParentId = payload.targetId
    insertIndex = notes.value.filter(n => n.parentId === payload.targetId && n.id !== payload.id).length
  } else {
    if (!payload.targetId) return
    const target = notes.value.find(n => n.id === payload.targetId)
    if (!target) return
    newParentId = target.parentId || ''
    const siblingsExcl = notes.value
      .filter(n => (n.parentId || '') === newParentId && n.id !== payload.id)
      .sort((a, b) => a.order - b.order)
    const targetIdx = siblingsExcl.findIndex(n => n.id === payload.targetId)
    if (targetIdx === -1) return
    insertIndex = payload.position === 'before' ? targetIdx : targetIdx + 1
  }

  const oldParentId = moved.parentId || ''

  const newSiblings = notes.value
    .filter(n => (n.parentId || '') === newParentId && n.id !== payload.id)
    .sort((a, b) => a.order - b.order)
  newSiblings.splice(insertIndex, 0, moved)

  for (let i = 0; i < newSiblings.length; i++) {
    const row = newSiblings[i]
    const isMoved = row.id === payload.id
    const needsParentChange = isMoved && (row.parentId || '') !== newParentId
    const needsOrderChange = row.order !== i
    if (!needsParentChange && !needsOrderChange) continue
    const doc = await db.notes.findOne(row.id).exec()
    if (!doc) continue
    const patch: Record<string, any> = { order: i, updatedAt: now() }
    if (needsParentChange) patch.parentId = newParentId
    await doc.patch(patch)
  }

  if (oldParentId !== newParentId) {
    const oldSiblings = notes.value
      .filter(n => (n.parentId || '') === oldParentId && n.id !== payload.id)
      .sort((a, b) => a.order - b.order)
    for (let i = 0; i < oldSiblings.length; i++) {
      if (oldSiblings[i].order === i) continue
      const doc = await db.notes.findOne(oldSiblings[i].id).exec()
      if (!doc) continue
      await doc.patch({ order: i, updatedAt: now() })
    }
  }

  await loadNotes()
}
</script>

<style scoped>
.notes-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}

.notes-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  will-change: transform;
}

.bg-blob-1 {
  top: -10%;
  left: -8%;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgb(255, 138, 173) 0%, rgba(255, 138, 173, 0) 70%);
  animation: drift1 24s ease-in-out infinite;
}

.bg-blob-2 {
  top: -5%;
  right: -5%;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgb(120, 174, 255) 0%, rgba(120, 174, 255, 0) 70%);
  animation: drift2 30s ease-in-out infinite;
}

.bg-blob-3 {
  bottom: -15%;
  left: 30%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgb(177, 156, 255) 0%, rgba(177, 156, 255, 0) 70%);
  animation: drift3 36s ease-in-out infinite;
}

.bg-grain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(0, 0, 0, 0.025) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
  opacity: 0.6;
}

@keyframes drift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, 40px) scale(1.08); }
}

@keyframes drift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-50px, 60px) scale(1.06); }
}

@keyframes drift3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, -50px) scale(1.1); }
}

.notes-container {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
}

.notes-sidebar {
  width: 320px;
  flex-shrink: 0;
  transition: width 0.25s ease;
  overflow: hidden;
}

.notes-sidebar.collapsed {
  width: 0;
}

.sidebar-toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 48px;
  margin-top: auto;
  margin-bottom: auto;
  border-radius: 0 8px 8px 0;
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-left: none;
  color: rgba(60, 60, 67, 0.45);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
  z-index: 10;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.9);
  color: rgba(0, 122, 255, 0.85);
}

.sidebar-toggle:active {
  transform: scaleX(0.92);
}

.sidebar-toggle.collapsed {
  border-radius: 0 8px 8px 0;
  margin-left: 0;
}

.notes-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 16px 16px 12px;
}

.editor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.empty-content {
  text-align: center;
  padding: 56px 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 12px 40px rgba(0, 0, 0, 0.06);
  max-width: 420px;
}

.empty-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    rgba(0, 122, 255, 0.18) 0%,
    rgba(94, 92, 230, 0.14) 100%
  );
  border: 0.5px solid rgba(0, 122, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 40px;
  color: rgb(0, 102, 230);
}

.empty-content h2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  color: rgba(0, 0, 0, 0.92);
}

.empty-content p {
  font-size: 14px;
  line-height: 1.55;
  margin: 0 0 24px;
  color: rgba(60, 60, 67, 0.65);
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 6px 20px rgba(0, 122, 255, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 8px 28px rgba(0, 122, 255, 0.4);
}

.create-btn:active {
  transform: scale(0.97);
}
</style>
