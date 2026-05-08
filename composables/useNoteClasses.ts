import type { Class, ClassField, NoteClassBinding, ClassFieldType } from '~/types/block'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'

const classes = ref<Class[]>([])
const classFields = ref<ClassField[]>([])
const noteBindings = ref<NoteClassBinding[]>([])
export const lastCreatedClassId = ref<string | null>(null)

let unsubClasses: (() => void) | null = null
let unsubFields: (() => void) | null = null
let unsubBindings: (() => void) | null = null

function startWatchingNoteClasses() {
  if (unsubClasses) unsubClasses()
  if (unsubFields) unsubFields()
  if (unsubBindings) unsubBindings()

  unsubClasses = onCollectionChange('classes', loadClasses)
  unsubFields = onCollectionChange('classFields', loadAllFields)
  unsubBindings = onCollectionChange('noteClassBindings', loadBindings)
}

function stopWatchingNoteClasses() {
  if (unsubClasses) { unsubClasses(); unsubClasses = null }
  if (unsubFields) { unsubFields(); unsubFields = null }
  if (unsubBindings) { unsubBindings(); unsubBindings = null }
}

async function loadAllFields() {
  const db = await getDB()
  const result = await db.classFields.find({ sort: [{ order: 'asc' }] }).exec()
  classFields.value = result.map((doc: any) => doc.toJSON())
}

// 工作空间切换时清空全局状态并重新订阅
if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    classes.value = []
    classFields.value = []
    noteBindings.value = []
    lastCreatedClassId.value = null
    stopWatchingNoteClasses()
    startWatchingNoteClasses()
    loadClasses()
    loadBindings()
    loadAllFields()
  })
}

export async function loadClasses(): Promise<Class[]> {
  const db = await getDB()
  const result = await db.classes.find({
    sort: [{ order: 'asc' }]
  }).exec()
  classes.value = result.map((doc: any) => doc.toJSON())
  return classes.value
}

export async function loadBindings(): Promise<NoteClassBinding[]> {
  const db = await getDB()
  const result = await db.noteClassBindings.find().exec()
  noteBindings.value = result.map((doc: any) => doc.toJSON())
  return noteBindings.value
}

export async function createClass(data: Partial<Class> & { name: string }): Promise<Class> {
  const db = await getDB()
  const existing = classes.value
  const newClass: Class = {
    id: generateId(),
    name: data.name,
    icon: data.icon || 'solar:document-text-linear',
    color: data.color || '#007AFF',
    description: data.description || '',
    order: data.order ?? existing.length,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.classes.insert({ ...newClass })
  classes.value.push(newClass)
  lastCreatedClassId.value = newClass.id
  return newClass
}

export async function updateClass(id: string, patch: Partial<Class>): Promise<void> {
  const db = await getDB()
  const doc = await db.classes.findOne(id).exec()
  if (!doc) return
  await doc.patch({ ...patch, updatedAt: now() })
  const idx = classes.value.findIndex(c => c.id === id)
  if (idx !== -1) {
    classes.value[idx] = { ...classes.value[idx], ...patch, updatedAt: now() }
  }
}

export async function deleteClass(id: string): Promise<void> {
  const db = await getDB()
  const doc = await db.classes.findOne(id).exec()
  if (!doc) return
  await doc.remove()

  const fields = await db.classFields.find({ selector: { classId: id } }).exec()
  for (const field of fields) {
    await field.remove()
  }

  const bindings = await db.noteClassBindings.find({ selector: { classId: id } }).exec()
  for (const binding of bindings) {
    await binding.remove()
  }

  classes.value = classes.value.filter(c => c.id !== id)
  classFields.value = classFields.value.filter(f => f.classId !== id)
  noteBindings.value = noteBindings.value.filter(b => b.classId !== id)
}

export async function loadFields(classId: string): Promise<ClassField[]> {
  const db = await getDB()
  const result = await db.classFields.find({
    selector: { classId },
    sort: [{ order: 'asc' }]
  }).exec()
  const fields = result.map((doc: any) => doc.toJSON())
  classFields.value = [...classFields.value.filter(f => f.classId !== classId), ...fields]
  return fields
}

export async function createField(
  classId: string,
  data: Partial<ClassField> & { name: string; type: ClassFieldType }
): Promise<ClassField> {
  const db = await getDB()
  const existing = classFields.value.filter(f => f.classId === classId)
  const newField: ClassField = {
    id: generateId(),
    classId,
    name: data.name,
    type: data.type,
    options: data.options ? [...data.options] : [],
    required: data.required ?? false,
    order: data.order ?? existing.length,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.classFields.insert(newField)
  classFields.value.push(newField)
  return newField
}

export async function updateField(id: string, patch: Partial<ClassField>): Promise<void> {
  const db = await getDB()
  const doc = await db.classFields.findOne(id).exec()
  if (!doc) return
  await doc.patch({ ...patch, updatedAt: now() })
  const idx = classFields.value.findIndex(f => f.id === id)
  if (idx !== -1) {
    classFields.value[idx] = { ...classFields.value[idx], ...patch, updatedAt: now() }
  }
}

export async function deleteField(id: string): Promise<void> {
  const db = await getDB()
  const doc = await db.classFields.findOne(id).exec()
  if (!doc) return
  await doc.remove()
  classFields.value = classFields.value.filter(f => f.id !== id)
}

export async function bindClass(noteId: string, classId: string): Promise<NoteClassBinding> {
  const db = await getDB()
  const existing = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (existing) {
    await existing.remove()
  }
  const binding: NoteClassBinding = {
    id: generateId(),
    noteId,
    classId,
    values: {},
    createdAt: now(),
    updatedAt: now(),
  }
  await db.noteClassBindings.insert(binding)
  noteBindings.value = noteBindings.value.filter(b => b.noteId !== noteId)
  noteBindings.value.push(binding)
  return binding
}

export async function unbindClass(noteId: string): Promise<void> {
  const db = await getDB()
  const existing = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (existing) {
    await existing.remove()
  }
  noteBindings.value = noteBindings.value.filter(b => b.noteId !== noteId)
}

export async function updateBindingValues(
  noteId: string,
  values: Record<string, any>
): Promise<void> {
  const db = await getDB()
  const existing = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (!existing) return
  await existing.patch({ values, updatedAt: now() })
  const idx = noteBindings.value.findIndex(b => b.noteId === noteId)
  if (idx !== -1) {
    noteBindings.value[idx] = { ...noteBindings.value[idx], values, updatedAt: now() }
  }
}

export async function getClassForNote(noteId: string): Promise<{
  class: Class
  fields: ClassField[]
  binding: NoteClassBinding
} | null> {
  // 优先从缓存查找
  const binding = noteBindings.value.find(b => b.noteId === noteId)
  if (binding) {
    const cls = classes.value.find(c => c.id === binding.classId)
    if (cls) {
      const fields = classFields.value
        .filter(f => f.classId === cls.id)
        .sort((a, b) => a.order - b.order)
      return { class: cls, fields, binding }
    }
  }

  // 缓存未命中，查 DB
  const db = await getDB()
  const dbBinding = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (!dbBinding) return null
  const cls = await db.classes.findOne(dbBinding.classId).exec()
  if (!cls) return null
  const fields = await db.classFields.find({
    selector: { classId: dbBinding.classId },
    sort: [{ order: 'asc' }]
  }).exec()
  return {
    class: cls.toJSON() as Class,
    fields: fields.map((doc: any) => doc.toJSON()),
    binding: dbBinding.toJSON() as NoteClassBinding
  }
}

export function useNoteClasses() {
  startWatchingNoteClasses()
  return {
    classes,
    classFields,
    noteBindings,
    lastCreatedClassId,
    loadClasses,
    loadBindings,
    createClass,
    updateClass,
    deleteClass,
    loadFields,
    createField,
    updateField,
    deleteField,
    bindClass,
    unbindClass,
    updateBindingValues,
    getClassForNote
  }
}
