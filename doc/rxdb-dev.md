# RxDB 开发指南

## 项目中的实际问题和解决方案

### 1. Schema 版本管理

#### 问题：DB6 - Schema Hash Mismatch
```typescript
// 错误：修改了 schema 但没有增加版本号
RxError (DB6): another instance created this collection with a different schema
```

#### 解决方案
```typescript
// ✅ 正确做法：每次修改 schema 必须递增版本号
const schemaVersion = 1 // 初始版本

// 修改 schema 后
const schemaVersion = 2 // 必须增加版本号
```

#### 项目中的版本历史
- Version 1: 初始 schema
- Version 2: 清理 RxDB 内部字段
- Version 3: 移除 default 值
- Version 4: 简化 schema 结构
- Version 5: 修复 metadata 字段问题
- Version 6: 尝试使用 defaultProperties（失败）
- Version 7: 移除 defaultProperties

**最终方案：重置到版本 1，清理数据库重新开始**

---

### 2. Proxy 系统冲突（核心问题）

#### 问题：Proxy DefaultValues Conflict
```typescript
// 错误信息
TypeError: 'get' on proxy: property 'defaultValues' is a read-only and 
non-configurable data property on the proxy target but the proxy did not 
return its actual value

// 位置
at fillObjectWithDefaults (rx-schema-helper.ts:364)
```

#### 触发条件
```typescript
// ❌ 错误做法 - 字段级别的 default 值
properties: {
  type: {
    type: 'string',
    enum: ['text', 'heading'],
    default: 'text'  // ❌ 这会触发 proxy 冲突
  },
  content: {
    type: 'string',
    default: ''  // ❌ 这也会触发
  }
}

// ❌ 错误做法 - additionalProperties: true
properties: {
  metadata: {
    type: 'object',
    additionalProperties: true  // ❌ 触发代理问题
  }
}
```

#### 解决方案

##### 方案 1：避免使用 default 值
```typescript
// ✅ 正确做法 - 不在 schema 中定义 default
properties: {
  type: {
    type: 'string',
    enum: ['text', 'heading', 'list']
    // ✅ 不使用 default
  },
  content: {
    type: 'string',
    maxLength: 10000
    // ✅ 不使用 default
  }
}

// 在代码中提供默认值
const newBlock = {
  type: 'text',      // 代码中提供默认值
  content: '',        // 代码中提供默认值
  order: 0,
  // ...
}
```

##### 方案 2：使用 migration 提供默认值
```typescript
migrationStrategies: {
  1: (doc: any) => {
    return {
      ...doc,
      type: doc.type || 'text',  // ✅ 在 migration 中提供默认值
      content: doc.content || '',
      order: doc.order ?? 0
    }
  }
}
```

#### 错误的尝试
```typescript
// ❌ 方案 1：defaultProperties（不存在）
defaultProperties: {  // ❌ Ajv 不识别这个关键字
  type: 'text',
  content: ''
}

// ❌ 方案 2：finalProperties（不解决问题）
finalProperties: {  // ❌ 不解决 proxy 冲突
  type: 'string',
  content: 'string'
}

// ❌ 方案 3：禁用 dev-mode（导致 DB9 错误）
// addRxPlugin(RxDBDevModePlugin)  // ❌ 禁用后无法看到详细错误
```

---

### 3. Dev Mode 插件问题

#### 问题：DVM1 - Dev Mode Validation Requirement
```typescript
// 错误：Dev Mode 启用时必须使用 schema validator
RxError (DVM1): The storage Adapter you use does not support schema validation
```

#### 解决方案
```typescript
// ✅ 正确做法 - 使用 wrappedValidateAjvStorage
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'

db = await createRxDatabase({
  name: 'lifeos-notes',
  storage: wrappedValidateAjvStorage({  // ✅ 必须包装 storage
    storage: getRxStorageDexie()
  })
})
```

#### Dev Mode 的双刃剑
```typescript
// ✅ 优点
addRxPlugin(RxDBDevModePlugin)  // 提供详细的错误信息
// - 开发时能看到具体的错误描述
// - 帮助发现 schema 问题
// - 验证数据结构正确性

// ❌ 缺点
// - 可能在某些配置下触发 proxy 冲突
// - 性能开销（仅影响开发）
// - 强制使用 schema validator
```

---

### 4. 历史数据迁移问题

#### 问题：RxDB 内部字段残留
```typescript
// 数据库中的旧 schema 包含这些字段
{
  _deleted: boolean,      // RxDB 内部字段
  _rev: string,            // RxDB 版本字段
  _meta: { lwt: number },  // RxDB 元数据
  _attachments: object      // RxDB 附件字段
}

// 新 schema 没有这些字段，导致 hash 不匹配
```

#### 解决方案
```typescript
// ✅ 正确做法 - 在 migration 中清理内部字段
migrationStrategies: {
  2: (doc: any) => {
    // ✅ 使用解构移除 RxDB 内部字段
    const { _deleted, _rev, _meta, _attachments, ...cleanedDoc } = doc
    return cleanedDoc
  }
}
```

---

### 5. Schema 定义最佳实践

#### 基础 Schema 结构
```typescript
{
  version: 1,                    // ✅ 版本号，修改 schema 必须递增
  primaryKey: 'id',               // ✅ 主键
  type: 'object',                 // ✅ JSON Schema 类型
  properties: {                   // ✅ 字段定义
    id: {
      type: 'string',
      maxLength: 100
    },
    type: {
      type: 'string',
      enum: ['text', 'heading', 'list'],
      maxLength: 20
    },
    content: {
      type: 'string',
      maxLength: 10000
    },
    order: {
      type: 'number',
      multipleOf: 1,       // ✅ 必须是整数
      minimum: 0,
      maximum: 999999
    }
  },
  required: ['id', 'type', 'content', 'order'],  // ✅ 必填字段
  indexes: [                    // ✅ 查询索引
    ['type'],
    ['type', 'order']
  ]
}
```

#### 避免的反模式
```typescript
// ❌ 不要使用 default（除非必要）
type: {
  type: 'string',
  default: 'text'  // ❌ 可能触发 proxy 冲突
}

// ❌ 不要使用 additionalProperties: true
metadata: {
  type: 'object',
  additionalProperties: true  // ❌ 可能在验证时出问题
}

// ❌ 不要使用不存在的关键字
defaultProperties: {   // ❌ Ajv 不识别
  type: 'text'
}
finalProperties: {      // ❌ 不是有效关键字
  type: 'string'
}

// ❌ 不要忘记版本号递增
schema: {
  version: 1  // ❌ 修改了 properties 但版本号没变
}
```

---

### 6. 数据库清理和重置

#### 方案：手动清理 IndexedDB
```typescript
// ✅ 完全重置数据库
async function clearDatabase() {
  const DB_NAME = 'lifeos-notes'
  try {
    const request = indexedDB.deleteDatabase(DB_NAME)
    await new Promise((resolve, reject) => {
      request.onsuccess = resolve
      request.onerror = reject
    })
    console.log('Cleared database:', DB_NAME)
  } catch (error) {
    console.warn('Database clear failed:', error)
  }
}

// 在初始化前调用
export async function initRxDB() {
  await clearDatabase()  // ✅ 清理旧数据
  // ... 初始化新数据库
}
```

#### 方案：版本递增迁移
```typescript
// ✅ 递增版本并清理旧数据
const schemaVersion = 2  // ✅ 递增版本

migrationStrategies: {
  2: (doc: any) => {
    // ✅ 清理不需要的字段
    const { oldField, ...cleanedDoc } = doc
    return cleanedDoc
  }
}
```

---

### 7. 实际工作中的配置

#### 最终工作配置
```typescript
import { createRxDatabase, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema'

// ✅ 只启用必要的插件
addRxPlugin(RxDBMigrationSchemaPlugin)

let db: any = null

export async function initRxDB() {
  if (db) return db

  // ✅ 清理旧数据库
  await clearDatabase()

  // ✅ 使用简单、稳定的配置
  db = await createRxDatabase({
    name: 'lifeos-notes',
    storage: wrappedValidateAjvStorage({  // ✅ 必须包装
      storage: getRxStorageDexie()
    }),
    multiInstance: true,
    ignoreDuplicate: true
  })

  // ✅ 简单的 schema 版本管理
  await db.addCollections({
    blocks: {
      schema: {
        version: 1,              // ✅ 简单的版本号
        primaryKey: 'id',
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          type: {
            type: 'string',
            enum: ['text', 'heading', 'list']
            // ✅ 没有 default
          },
          content: {
            type: 'string',
            maxLength: 10000
            // ✅ 没有 default
          }
        },
        required: ['id', 'type', 'content'],
        migrationStrategies: {
          1: (doc: any) => doc  // ✅ 简单的迁移
        }
      }
    }
  })

  return db
}
```

---

### 8. 常见错误和快速诊断

#### 错误代码速查

| 错误代码 | 含义 | 快速修复 |
|---------|------|---------|
| **DB6** | Schema hash mismatch | 增加 schema version 号 |
| **DB9** | 通用错误 | 启用 dev-mode 查看详细信息 |
| **DVM1** | 需要 schema validator | 使用 `wrappedValidateAjvStorage()` |
| **Proxy Error** | DefaultValues 冲突 | 移除字段级别的 `default` |

#### 诊断流程
```
1. 看到 DB9 错误？
   → 启用 dev-mode 查看真实错误
   → 或清空数据库重新开始

2. 看到 DB6 错误？
   → 增加 schema version 号
   → 添加 migration 策略

3. 看到 Proxy 冲突？
   → 移除 default 值
   → 简化 schema 结构
   → 检查 additionalProperties 配置

4. 看到 DVM1 错误？
   → 确保 storage 被 wrappedValidateAjvStorage 包装
```

---

### 9. 项目特定经验总结

#### ✅ 成功的做法
```typescript
// 1. 使用最简单的 schema 结构
schema: {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: [...] }
  },
  required: ['id', 'type'],
  indexes: [['type']]
}

// 2. 在代码中提供默认值，而不是 schema
const newData = {
  id: generateId(),
  type: 'text',  // ✅ 代码中默认值
  content: ''   // ✅ 代码中默认值
}

// 3. 简单的迁移策略
migrationStrategies: {
  1: (doc: any) => doc  // ✅ pass-through
}
```

#### ❌ 失败的尝试
```typescript
// ❌ 复杂的 default 值配置
default: 'text'
defaultProperties: { type: 'text' }

// ❌ 多版本累积的迁移
1: clean old fields
2: remove defaults
3: simplify structure
// → 导致难以追踪和调试

// ❌ 试图绕过验证
移除 wrappedValidateAjvStorage
移除 RxDBMigrationSchemaPlugin
// → 导致更难诊断的错误
```

---

### 10. 最佳实践清单

#### Schema 设计
- [ ] 每次修改 schema 都增加 `version` 号
- [ ] 不使用字段级别的 `default` 值
- [ ] 不使用 `additionalProperties: true`
- [ ] 使用简单的 `enum` 而不是复杂的逻辑
- [ ] 明确指定 `required` 字段
- [ ] 合理设计 `indexes` 提升查询性能

#### 数据库管理
- [ ] 使用 `wrappedValidateAjvStorage()` 包装 storage
- [ ] 保持 schema 版本简单（1, 2, 3...）
- [ ] migration 策略保持简单
- [ ] 出现问题时清空数据库重新开始
- [ ] 保留 `RxDBMigrationSchemaPlugin` 支持迁移

#### 开发流程
- [ ] 出现 DB9 错误时启用 dev-mode
- [ ] 出现 Proxy 错误时简化 schema
- [ ] 出现 DB6 错误时增加版本号
- [ ] 定期测试数据插入和查询
- [ ] 记录重要的 schema 变更

---

### 11. 参考资源

#### RxDB 官方文档
- [官方文档](https://rxdb.info/overview.html)
- [Schema 定义](https://rxdb.info/rx-schema.html)
- [迁移策略](https://rxdb.info/rx-schema.html?console=migration)
- [错误代码](https://rxdb.info/errors.html)
- [Dev Mode](https://rxdb.info/dev-mode.html)

#### 关键理解
1. **Schema 版本号**：每次修改都要递增
2. **Proxy 冲突**：避免使用 default 值
3. **Dev Mode**：开发时启用，生产时禁用
4. **Migration**：保持简单，避免复杂逻辑
5. **Storage 包装**：必须使用 `wrappedValidateAjvStorage()`

---

### 12. 项目配置模板

```typescript
// services/rxdb.ts
import { createRxDatabase, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema'

addRxPlugin(RxDBMigrationSchemaPlugin)

let db: any = null

export async function initRxDB() {
  if (db) return db

  db = await createRxDatabase({
    name: 'your-database-name',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie()
    }),
    multiInstance: true,
    ignoreDuplicate: true
  })

  await db.addCollections({
    yourCollection: {
      schema: {
        version: 1,
        primaryKey: 'id',
        type: 'object',
        properties: {
          // 简单、清晰的字段定义
        },
        required: [],
        indexes: []
      },
      migrationStrategies: {
        1: (doc: any) => doc
      }
    }
  })

  return db
}
```

---

**最后更新**: 2026-05-02
**版本**: 1.0
**状态**: 实践总结，基于实际项目经验
