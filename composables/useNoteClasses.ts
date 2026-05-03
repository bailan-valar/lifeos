import type { Class, ClassField, NoteClassBinding, ClassFieldType } from '~/types/block'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null
const classes = ref<Class[]>([])
const classFields = ref<ClassField[]>([])

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

export async function loadClasses(userId: string): Promise<Class[]> {
  const db = await getDb()
  const result = await db.classes.find({
    selector: { userId },
    sort: [{ order: 'asc' }]
  }).exec()
  classes.value = result.map((doc: any) => doc.toJSON())
  return classes.value
}

export async function createClass(data: Partial<Class> & { userId: string; name: string }): Promise<Class> {
  const db = await getDb()
  const existing = classes.value.filter(c => c.userId === data.userId)
  const newClass: Class = {
    id: generateId(),
    userId: data.userId,
    name: data.name,
    icon: data.icon || 'solar:document-text-linear',
    color: data.color || '#007AFF',
    description: data.description || '',
    order: data.order ?? existing.length,
    createdAt: now(),
    updatedAt: now(),
    isSynced: false
  }
  await db.classes.insert({ ...newClass })
  classes.value.push(newClass)
  return newClass
}

export async function updateClass(id: string, patch: Partial<Class>): Promise<void> {
  const db = await getDb()
  const doc = await db.classes.findOne(id).exec()
  if (!doc) return
  await doc.patch({ ...patch, updatedAt: now() })
  const idx = classes.value.findIndex(c => c.id === id)
  if (idx !== -1) {
    classes.value[idx] = { ...classes.value[idx], ...patch, updatedAt: now() }
  }
}

export async function deleteClass(id: string): Promise<void> {
  const db = await getDb()
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
}

export async function loadFields(classId: string): Promise<ClassField[]> {
  const db = await getDb()
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
  const db = await getDb()
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
    isSynced: false
  }
  await db.classFields.insert(newField)
  classFields.value.push(newField)
  return newField
}

export async function updateField(id: string, patch: Partial<ClassField>): Promise<void> {
  const db = await getDb()
  const doc = await db.classFields.findOne(id).exec()
  if (!doc) return
  await doc.patch({ ...patch, updatedAt: now() })
  const idx = classFields.value.findIndex(f => f.id === id)
  if (idx !== -1) {
    classFields.value[idx] = { ...classFields.value[idx], ...patch, updatedAt: now() }
  }
}

export async function deleteField(id: string): Promise<void> {
  const db = await getDb()
  const doc = await db.classFields.findOne(id).exec()
  if (!doc) return
  await doc.remove()
  classFields.value = classFields.value.filter(f => f.id !== id)
}

export async function loadBinding(noteId: string): Promise<NoteClassBinding | null> {
  const db = await getDb()
  const result = await db.noteClassBindings.findOne({
    selector: { noteId }
  }).exec()
  return result ? result.toJSON() : null
}

export async function bindClass(noteId: string, classId: string): Promise<NoteClassBinding> {
  const db = await getDb()
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
    isSynced: false
  }
  await db.noteClassBindings.insert(binding)
  return binding
}

export async function unbindClass(noteId: string): Promise<void> {
  const db = await getDb()
  const existing = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (existing) {
    await existing.remove()
  }
}

export async function updateBindingValues(
  noteId: string,
  values: Record<string, any>
): Promise<void> {
  const db = await getDb()
  const existing = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (!existing) return
  await existing.patch({ values, updatedAt: now() })
}

export async function getClassForNote(noteId: string): Promise<{
  class: Class
  fields: ClassField[]
  binding: NoteClassBinding
} | null> {
  const db = await getDb()
  const binding = await db.noteClassBindings.findOne({ selector: { noteId } }).exec()
  if (!binding) return null
  const cls = await db.classes.findOne(binding.classId).exec()
  if (!cls) return null
  const fields = await db.classFields.find({
    selector: { classId: binding.classId },
    sort: [{ order: 'asc' }]
  }).exec()
  return {
    class: cls.toJSON(),
    fields: fields.map((doc: any) => doc.toJSON()),
    binding: binding.toJSON()
  }
}

export function useNoteClasses() {
  return {
    classes,
    classFields,
    loadClasses,
    createClass,
    updateClass,
    deleteClass,
    loadFields,
    createField,
    updateField,
    deleteField,
    loadBinding,
    bindClass,
    unbindClass,
    updateBindingValues,
    getClassForNote
  }
}
