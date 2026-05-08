import type { Note } from '~/types/block'
import { getDB, onCollectionChange } from '~/services/db'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[]
  level: number
}

export function useNotes() {
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let unsubscribe: (() => void) | null = null

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

  function startWatching() {
    if (unsubscribe) return
    unsubscribe = onCollectionChange('notes', () => {
      loadNotes()
    })
  }

  function stopWatching() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  if (getCurrentInstance()) {
    onMounted(startWatching)
    onUnmounted(stopWatching)
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
    getDescendantNoteIds,
    startWatching,
    stopWatching
  }
}
