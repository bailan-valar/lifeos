export type BlockType = 'text' | 'heading' | 'list' | 'orderedList' | 'todo' | 'code' | 'quote' | 'divider' | 'image' | 'callout'

export interface BlockMetadata {
  level?: number
  checked?: boolean
  language?: string
  align?: 'left' | 'center' | 'right'
  color?: string
  indent?: number
  [key: string]: any
}

export interface Block {
  id: string
  noteId: string
  type: BlockType
  content: string
  metadata?: BlockMetadata
  order: number
  createdAt: string
  updatedAt: string
  version: number
  isSynced: boolean
}

export interface Note {
  id: string
  userId: string
  title: string
  folderId: string
  parentId: string // '' = root level; otherwise the id of the parent note
  order: number
  createdAt: string
  updatedAt: string
  version: number
  isSynced: boolean
}

export interface Folder {
  id: string
  userId: string
  name: string
  parentId: string // '' = root level
  order: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  isSynced: boolean
}

export interface NoteTag {
  id: string
  noteId: string
  tagId: string
  createdAt: string
  isSynced: boolean
}

export interface BlockLink {
  id: string
  sourceBlockId: string
  targetBlockId: string
  createdAt: string
  isSynced: boolean
}

export type ClassFieldType = 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'url' | 'email'

export interface Class {
  id: string
  userId: string
  name: string
  icon: string
  color: string
  description: string
  order: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface ClassField {
  id: string
  classId: string
  name: string
  type: ClassFieldType
  options: string[]
  required: boolean
  order: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface NoteClassBinding {
  id: string
  noteId: string
  classId: string
  values: Record<string, any>
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface BlockNoteSystem {
  folders: Folder[]
  notes: Note[]
  blocks: Block[]
  tags: Tag[]
  noteTags: NoteTag[]
  blockLinks: BlockLink[]
  classes: Class[]
  classFields: ClassField[]
  noteClassBindings: NoteClassBinding[]
}
