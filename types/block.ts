export type BlockType = 'text' | 'heading' | 'list' | 'code' | 'quote' | 'divider' | 'image' | 'callout'

export interface BlockMetadata {
  level?: number
  checked?: boolean
  language?: string
  align?: 'left' | 'center' | 'right'
  color?: string
  [key: string]: any
}

export interface Block {
  id: string
  noteId: string
  type: BlockType
  content: string
  order: number
  metadata: BlockMetadata
  createdAt: string
  updatedAt: string
  version: number
  synced: boolean
}

export interface Note {
  id: string
  userId: string
  title: string
  folderId: string | null
  order: number
  createdAt: string
  updatedAt: string
  version: number
  synced: boolean
}

export interface Folder {
  id: string
  userId: string
  name: string
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
  synced: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  synced: boolean
}

export interface NoteTag {
  id: string
  noteId: string
  tagId: string
  createdAt: string
  synced: boolean
}

export interface BlockLink {
  id: string
  sourceBlockId: string
  targetBlockId: string
  createdAt: string
  synced: boolean
}

export interface BlockNoteSystem {
  folders: Folder[]
  notes: Note[]
  blocks: Block[]
  tags: Tag[]
  noteTags: NoteTag[]
  blockLinks: BlockLink[]
}
