import { createRxDatabase } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js'
import type {
  Block,
  Note,
  Folder,
  Tag,
  NoteTag,
  BlockLink
} from '~/types/block'

let db: any = null

export async function initRxDB() {
  if (db) return db

  const { addRxPlugin } = await import('rxdb')
  const { RxDBReplicationPlugin } = await import('rxdb/plugins/replication')
  addRxPlugin(RxDBReplicationPlugin)

  const schemaVersion = 1

  db = await createRxDatabase({
    name: 'lifeos-notes',
    storage: wrappedKeyEncryptionCryptoJsStorage({
      storage: getRxStorageDexie(),
      password: 'default-password'
    }),
    multiInstance: true,
    ignoreDuplicate: true
  })

  await db.addCollections({
    blocks: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          noteId: { type: 'string' },
          type: { type: 'string', enum: ['text', 'heading', 'list', 'code', 'quote', 'divider', 'image', 'callout'] },
          content: { type: 'string' },
          order: { type: 'number' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          version: { type: 'number' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'noteId', 'type', 'order', 'createdAt', 'updatedAt', 'version', 'synced'],
        indexes: [
          ['noteId'],
          ['noteId', 'order'],
          ['synced']
        ]
      }
    },
    notes: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          userId: { type: 'string' },
          title: { type: 'string' },
          folderId: { type: ['string', 'null'] },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          version: { type: 'number' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'userId', 'title', 'order', 'createdAt', 'updatedAt', 'version', 'synced'],
        indexes: [
          ['userId'],
          ['folderId'],
          ['createdAt'],
          ['synced']
        ]
      }
    },
    folders: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          userId: { type: 'string' },
          name: { type: 'string' },
          parentId: { type: ['string', 'null'] },
          order: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'userId', 'name', 'order', 'createdAt', 'updatedAt', 'synced'],
        indexes: [
          ['userId'],
          ['parentId'],
          ['synced']
        ]
      }
    },
    tags: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string' },
          color: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'name', 'color', 'createdAt', 'synced'],
        indexes: [
          ['name'],
          ['synced']
        ]
      }
    },
    noteTags: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          noteId: { type: 'string' },
          tagId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'noteId', 'tagId', 'createdAt', 'synced'],
        indexes: [
          ['noteId'],
          ['tagId'],
          ['noteId', 'tagId'],
          ['synced']
        ]
      }
    },
    blockLinks: {
      schema: {
        version: schemaVersion,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          sourceBlockId: { type: 'string' },
          targetBlockId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          synced: { type: 'boolean' }
        },
        required: ['id', 'sourceBlockId', 'targetBlockId', 'createdAt', 'synced'],
        indexes: [
          ['sourceBlockId'],
          ['targetBlockId'],
          ['sourceBlockId', 'targetBlockId'],
          ['synced']
        ]
      }
    }
  })

  return db
}

export async function getRxDB() {
  if (!db) {
    db = await initRxDB()
  }
  return db
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function now(): string {
  return new Date().toISOString()
}
