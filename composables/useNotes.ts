import type { Note } from '~/types/block'
import { getDB, onCollectionChange } from '~/services/db'

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[]
  level: number
}

let _store: NotesStore | null = null
let _unsub: (() => void) | null = null

function startWatchingNotes() {
  if (_unsub) return
  _unsub = onCollectionChange('notes', () => {
    if (_store) _store.loadNotes()
  })
  // 初始加载数据
  if (_store) _store.loadNotes()
}

function stopWatchingNotes() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingNotes()
    startWatchingNotes()
    if (_store) _store.loadNotes()
  })
}

interface NotesStore {
  notes: Ref<Note[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  noteTree: ComputedRef<NoteTreeNode[]>
  noteOptions: ComputedRef<{ id: string; title: string; level: number }[]>
  loadNotes: () => Promise<void>
  buildNoteTree: (parentId?: string, level?: number) => NoteTreeNode[]
  getDescendantNoteIds: (noteId: string) => string[]
}

function createStore(): NotesStore {
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadNotes() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const result = await db.notes.find({
        sort: [{ order: 'asc' }]
      }).exec()
      notes.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load notes:', e)
    } finally {
      loading.value = false
    }
  }

  function buildNoteTree(parentId: string = '', level: number = 0): NoteTreeNode[] {
    return notes.value
      .filter(n => n.parentId === parentId)
      .map(n => ({
        ...n,
        children: buildNoteTree(n.id, level + 1),
        level
      }))
  }

  function getDescendantNoteIds(noteId: string): string[] {
    const result: string[] = [noteId]
    const queue = [noteId]
    while (queue.length > 0) {
      const current = queue.shift()!
      const children = notes.value.filter(n => n.parentId === current)
      for (const child of children) {
        result.push(child.id)
        queue.push(child.id)
      }
    }
    return result
  }

  const noteTree = computed(() => buildNoteTree())

  const noteOptions = computed(() => {
    const options: { id: string; title: string; level: number }[] = []
    function walk(nodes: NoteTreeNode[]) {
      for (const node of nodes) {
        options.push({ id: node.id, title: node.title, level: node.level })
        walk(node.children)
      }
    }
    walk(noteTree.value)
    return options
  })

  return {
    notes,
    loading,
    error,
    noteTree,
    noteOptions,
    loadNotes,
    buildNoteTree,
    getDescendantNoteIds
  }
}

export function useNotes(): NotesStore {
  if (!_store) {
    _store = createStore()
    startWatchingNotes()
  }
  return _store
}
