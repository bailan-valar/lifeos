import { createRxDatabase, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'

addRxPlugin(RxDBDevModePlugin)
addRxPlugin(RxDBMigrationSchemaPlugin)

let db: any = null
let initPromise: Promise<any> | null = null

// Storage must be cached at module level for ignoreDuplicate to work
const storage = wrappedValidateAjvStorage({
  storage: getRxStorageDexie()
})

const DB_NAME = 'lifeos-notes-v3'
const SCHEMA_VERSION = 8

export async function initRxDB() {
  if (db) return db
  if (initPromise) return initPromise

  initPromise = doInitRxDB()

  try {
    db = await initPromise
    return db
  } catch (error) {
    initPromise = null
    throw error
  }
}

async function doInitRxDB() {
  const database = await createRxDatabase({
    name: DB_NAME,
    storage,
    multiInstance: true,
    ignoreDuplicate: true
  })

  await database.addCollections({
    blocks: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          noteId: { type: 'string', maxLength: 100 },
          type: { type: 'string', enum: ['text', 'heading', 'list', 'todo', 'code', 'quote', 'divider', 'image', 'callout'], maxLength: 20 },
          content: { type: 'string', maxLength: 10000 },
          metadata: {
            type: 'object',
            properties: {
              level: { type: 'number' },
              language: { type: 'string', maxLength: 50 },
              align: { type: 'string', maxLength: 10 },
              color: { type: 'string', maxLength: 30 },
              checked: { type: 'boolean' }
            }
          },
          order: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          version: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'noteId', 'type', 'content', 'order', 'createdAt', 'updatedAt', 'version', 'isSynced'],
        indexes: [
          ['noteId'],
          ['noteId', 'order'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          const { _deleted, _rev, _meta, _attachments, ...cleanedDoc } = doc
          return cleanedDoc
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    notes: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          userId: { type: 'string', maxLength: 100 },
          title: { type: 'string', maxLength: 500 },
          folderId: { type: 'string', maxLength: 100 },
          parentId: { type: 'string', maxLength: 100 },
          order: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          version: { type: 'number', multipleOf: 1, minimum: 1, maximum: 999999 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'userId', 'title', 'folderId', 'parentId', 'order', 'createdAt', 'updatedAt', 'version', 'isSynced'],
        indexes: [
          ['userId'],
          ['createdAt'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          return {
            ...doc,
            folderId: doc.folderId || '',
            _deleted: undefined,
            _rev: undefined,
            _meta: undefined,
            _attachments: undefined
          }
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => ({
          ...doc,
          parentId: doc.parentId || ''
        }),
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    folders: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          userId: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 200 },
          parentId: { type: 'string', maxLength: 100 },
          order: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'userId', 'name', 'parentId', 'order', 'createdAt', 'updatedAt', 'isSynced'],
        indexes: [
          ['userId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          return {
            ...doc,
            parentId: doc.parentId || '',
            _deleted: undefined,
            _rev: undefined,
            _meta: undefined,
            _attachments: undefined
          }
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    tags: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 100 },
          color: { type: 'string', maxLength: 20 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'name', 'color', 'createdAt', 'isSynced'],
        indexes: [
          ['name'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          const { _deleted, _rev, _meta, _attachments, ...cleanedDoc } = doc
          return cleanedDoc
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    noteTags: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          noteId: { type: 'string', maxLength: 100 },
          tagId: { type: 'string', maxLength: 100 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'noteId', 'tagId', 'createdAt', 'isSynced'],
        indexes: [
          ['noteId'],
          ['tagId'],
          ['noteId', 'tagId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          const { _deleted, _rev, _meta, _attachments, ...cleanedDoc } = doc
          return cleanedDoc
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    blockLinks: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          sourceBlockId: { type: 'string', maxLength: 100 },
          targetBlockId: { type: 'string', maxLength: 100 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'sourceBlockId', 'targetBlockId', 'createdAt', 'isSynced'],
        indexes: [
          ['sourceBlockId'],
          ['targetBlockId'],
          ['sourceBlockId', 'targetBlockId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => {
          const { _deleted, _rev, _meta, _attachments, ...cleanedDoc } = doc
          return cleanedDoc
        },
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    classes: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          userId: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 100 },
          icon: { type: 'string', maxLength: 50 },
          color: { type: 'string', maxLength: 20 },
          description: { type: 'string', maxLength: 500 },
          order: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'userId', 'name', 'icon', 'color', 'description', 'order', 'createdAt', 'updatedAt', 'isSynced'],
        indexes: [
          ['userId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => doc,
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    classFields: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          classId: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 100 },
          type: { type: 'string', enum: ['text', 'number', 'date', 'select', 'multiSelect', 'checkbox', 'url', 'email'], maxLength: 20 },
          options: {
            type: 'array',
            items: { type: 'string', maxLength: 100 }
          },
          required: { type: 'boolean' },
          order: { type: 'number', multipleOf: 1, minimum: 0, maximum: 999999 },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'classId', 'name', 'type', 'options', 'required', 'order', 'createdAt', 'updatedAt', 'isSynced'],
        indexes: [
          ['classId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => doc,
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    },
    noteClassBindings: {
      schema: {
        version: SCHEMA_VERSION,
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          noteId: { type: 'string', maxLength: 100 },
          classId: { type: 'string', maxLength: 100 },
          values: {
            type: 'object',
            additionalProperties: true
          },
          createdAt: { type: 'string', format: 'date-time', maxLength: 50 },
          updatedAt: { type: 'string', format: 'date-time', maxLength: 50 },
          isSynced: { type: 'boolean' }
        },
        required: ['id', 'noteId', 'classId', 'values', 'createdAt', 'updatedAt', 'isSynced'],
        indexes: [
          ['noteId'],
          ['classId'],
          ['noteId', 'classId'],
          ['isSynced']
        ]
      },
      migrationStrategies: {
        1: (doc: any) => doc,
        2: (doc: any) => doc,
        3: (doc: any) => doc,
        4: (doc: any) => doc,
        5: (doc: any) => doc,
        6: (doc: any) => doc,
        7: (doc: any) => doc,
        8: (doc: any) => doc
      }
    }
  })

  return database
}

export async function getRxDB() {
  if (!db) {
    db = await initRxDB()
  }
  return db
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function now(): string {
  return new Date().toISOString()
}
