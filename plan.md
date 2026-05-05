# Implementation Plan: 远程 CouchDB 同步 + 多工作空间

> Source PRD: `.claude/PRPs/prds/couchdb-sync-workspaces.prd.md`
> Effort level: **HIGH** — 完整实现 + 测试 + 文档
> Branch: 当前 `feat/csv-import-rule-engine`,建议切到新分支 `feat/workspaces-couchdb-sync`

---

## 0. Requirements Restatement(确认理解)

将 lifeos 从「单库纯本地」升级为「多工作空间 + 每空间独立 CouchDB 双向同步」:

1. **工作空间(Workspace)** = 一组完全隔离的 18 个 PouchDB 集合,以 `lifeos-<workspaceId>-<collection>` 为 IndexedDB 名物理隔离。
2. **创建/命名/切换** 工作空间;切换后 UI 自顶向下重新加载该空间的数据。
3. **每空间独立 CouchDB URL**,通过 PouchDB 原生 `db.sync(remote, { live: true, retry: true })` 双向实时同步。
4. **同步状态指示器** 在顶部显示当前空间同步是 `idle / active / paused / error`。
5. **当前激活空间** 写入 localStorage,刷新后回到上次空间;空间元数据(列表)存于一个**独立的 meta DB**。
6. **废弃** `composables/useOfflineSync.ts` 与 `server/api/{notes,blocks,folders,tags}/*` 自定义 REST 同步。

**MVP 验收**:Mac + 手机两端同时连同一个 CouchDB,在 Mac 创建账单 → 手机 10 秒内出现;切换空间 A→B,UI 立刻只显示 B 的账单/笔记/预算。

---

## 1. Architectural Decisions(关键设计点)

### 1.1 所有空间一律 UUID,无特殊默认空间 ⭐

**背景**:开发阶段,旧的 `lifeos-<collection>` 数据可丢弃,无需向后兼容。

**决定**:**所有空间(包括首启自动创建的那个)都使用 UUID**,prefix 一律为 `lifeos-<uuid>-`。

```ts
function dbPrefix(workspaceId: string): string {
  return `lifeos-${workspaceId}-`
}
```

**首启行为**:meta DB 为空时,生成一个 UUID,创建名为 `默认空间` 的工作空间(id = 新 UUID,可被用户重命名),并设为 active。**此 UUID 与"default"字符串无关**,只是显示名叫"默认空间"。

**旧数据处理**:`plugins/pouchdb.client.ts.clearLegacyDatabases()` 顺便清理 `lifeos-bills`、`lifeos-notes`、...、`lifeos-importRecords` 这 18 个无前缀的旧 IndexedDB(列入清理清单),释放空间。`migrateAccountTypes` 不再需要(老数据被丢弃),整体删除该函数和 `lifeos:account-type-migrated-v2` 标志。

### 1.2 元数据存储:独立 meta DB

**问题**:工作空间列表本身存在哪?如果存在 `workspaces` 集合而该集合又被工作空间 prefix 包裹,就会互锁。

**决定**:新建一个**不受 prefix 影响**的 meta DB:`lifeos-meta-workspaces`,只存空间列表;localStorage 存 `lifeos:active-workspace-id` 用于启动时快速读取。**meta DB 不参与 CouchDB 同步**(每台设备自己管理空间列表与远程地址,可能用户不希望把 URL/凭证同步到云端)。

### 1.3 Composable 数据刷新策略:整页强制 remount

**问题**:14 个 composable 在模块作用域缓存了 `let dbRef: any = null`。切换空间后这些缓存指向旧 db 实例,如不刷新会读到错数据。

**候选方案**:
- (A) 给每个 composable 加全局 `workspaceVersion` watcher → 14 处改动,易遗漏
- (B) **改造 `getDB()` 为 workspace-aware,所有 composable 移除 `dbRef` 缓存,每次调用 `getDB()`** → 改 14 处但是机械式删除一行
- (C) 在 `<NuxtPage>` 外加 `:key="currentWorkspaceId"`,切换时整页 unmount+remount → 1 处改动,自然触发 `onMounted` 重载

**决定**:**(B) + (C) 组合**——
- `getDB()` 内部维护 `Map<workspaceId, Database>`,根据当前激活空间返回对应实例
- 删掉 composables 的 `let dbRef = null` 缓存(改成每次 `await getDB()`,getDB 自身是 O(1) 查 Map)
- `app.vue` 给 `<NuxtPage :key="workspaceStore.currentId">`,切换时整页重建

(B) 是底层正确性保证,(C) 是 UI 干净刷新。两者叠加可避免任何残留状态。

### 1.4 Sync 引擎:per-workspace × per-collection

每个空间一个 sync 控制器,持有 18 个 `PouchDB.sync()` handle。状态聚合规则:
- 任一 collection `error/denied` → 空间状态 = `error`
- 任一 collection `active` → 空间状态 = `active`
- 全部 `paused` 且无 error → `idle`(已同步)
- 未配置 remoteUrl → `disabled`

### 1.5 凭证传递

CouchDB Basic Auth 直接拼接到 URL:`https://user:pass@host:port/dbname-prefix`。本地存储**明文**(自托管信任模型,与 PRD 一致,v1 不做加密)。Remote DB 名 = `<remotePrefix><collection>`,由用户在配置页填写一个 prefix(默认 `lifeos-`)。

> 实际同步时,18 个本地 db 每个对应一个远端 db:`<remoteUrl>/lifeos-bills`、`<remoteUrl>/lifeos-notes`...用户需要在 CouchDB 端预创建这些 db,或我们在首次启动同步时调用 `new PouchDB(remoteUrl).info()` + 自动 `PUT` 创建。

### 1.6 Offline Sync 旧代码处理

**直接删除** `composables/useOfflineSync.ts`,以及 `server/api/notes`、`server/api/blocks`、`server/api/folders`、`server/api/tags`(如有)。grep 确认无任何调用方后再删。SyncStatus 类型如外部引用则迁移到新模块。

---

## 2. Files Affected(精确到文件级)

### 2.1 新增文件

| 文件 | 职责 |
|---|---|
| `services/workspaces.ts` | 工作空间 CRUD(读 meta DB)、激活空间存取、生成 prefix |
| `services/sync.ts` | per-workspace 的 PouchDB sync 启停、状态聚合、事件订阅 |
| `stores/workspace.ts` | Pinia store:`currentId` / `list` / `syncStatus` reactive 状态 |
| `composables/useWorkspaces.ts` | UI 用的薄封装(创建、切换、改 URL、删除) |
| `composables/useSyncStatus.ts` | 当前空间同步状态的响应式封装,供顶栏使用 |
| `components/workspace/WorkspaceSwitcher.vue` | 顶栏空间下拉(显示当前空间名 + 同步状态点) |
| `components/workspace/WorkspaceManagerDialog.vue` | 空间管理弹窗(列表、新建、改名、删除、CouchDB 配置) |
| `components/workspace/WorkspaceFormDialog.vue` | 单个空间编辑表单(名称 + remoteUrl + 测试连接) |
| `components/workspace/SyncStatusBadge.vue` | 同步状态徽章(active/idle/error) |
| `types/workspace.ts` | `Workspace`、`WorkspaceSyncStatus`、`SyncEvent` 类型 |
| `plugins/workspace.client.ts` | 启动时引导:载入 meta DB → 确保至少一个 workspace → 还原激活空间 → 自动启动同步 |

### 2.2 修改文件

| 文件 | 改动 |
|---|---|
| `package.json` | + `pouchdb-replication`,`@types/pouchdb-replication`,`uuid`,`@types/uuid` |
| `services/db.ts` | `DB_PREFIX` 常量 → `dbPrefix(workspaceId)` 函数;`database` 单例 → `Map<workspaceId, Database>`;新增 `closeWorkspaceDB(id)` 销毁单例 |
| `plugins/pouchdb.client.ts` | 扩展 `clearLegacyDatabases` 把 18 个 `lifeos-<collection>` 无前缀旧库一并清理;移除 `migrateAccountTypes`;顺序:cleanup → 载入 workspace meta → ensureBootstrapWorkspace → initDB(activeId) |
| `app.vue` | `<NuxtPage :key="workspaceStore.currentId" />`;在 menubar 内嵌入 `WorkspaceSwitcher` |
| `components/AppSidebar.vue` | 设置按钮的 emit 增加打开 `WorkspaceManagerDialog` 的入口(或合并到 ClassManager) |
| `composables/useNotes.ts` 等 9 个 | 删除 `let dbRef = null` + `getDb()` 包装;改为直接 `const db = await getDB()` |
| `composables/useOfflineSync.ts` | **删除** |
| `server/api/{notes,blocks,folders,tags}/*` | **删除** REST 同步端点(若存在,先 grep 验证) |

> 涉及 `dbRef` 删除的 composable 完整清单(grep 已确认):`useImportRules.ts`、`useBillCategories.ts`、`useBudgets.ts`、`useBills.ts`、`useNoteClasses.ts`、`useAccounts.ts`、`useImportRecords.ts`、`useStatements.ts`、`useNotes.ts` —— 9 个文件,机械式编辑。`useBlockEditor.ts` 内部使用函数局部 `let db`(不共享),保留;`useOfflineSync.ts` 整体删除。

---

## 3. Phase Breakdown(实施阶段)

### Phase 1: 基础设施 — 让 db 层支持多工作空间(预估 4-6h)

**目标**:`services/db.ts` 改造完成后,即便没有 UI,也能在控制台用 `getDB('uuid-1')`、`getDB('uuid-2')` 拿到两套隔离的 db。

**Tasks**:

1. **依赖**:`npm install pouchdb-replication @types/pouchdb-replication uuid @types/uuid`
2. **types/workspace.ts**:
   ```ts
   export interface Workspace {
     id: string             // UUID(每个空间均生成,无特殊保留 ID)
     name: string
     remoteUrl?: string     // CouchDB base URL (含 user:pass)
     remotePrefix?: string  // 远端 db 名前缀,默认 'lifeos-'
     createdAt: string
     updatedAt: string
   }
   export type WorkspaceSyncState = 'disabled' | 'idle' | 'active' | 'paused' | 'error'
   export interface WorkspaceSyncStatus {
     state: WorkspaceSyncState
     lastError?: string
     lastChangeAt?: string
     pendingPush: number    // 累计 outbound 变更
     pendingPull: number    // 累计 inbound 变更
   }
   ```
3. **services/workspaces.ts**:
   - `getMetaDB()`:封装 `new PouchDB('lifeos-meta-workspaces')`(注意:这里**不**走 `lifeos-<uuid>-` 前缀)
   - `listWorkspaces()` / `getWorkspace(id)` / `createWorkspace(input)` / `updateWorkspace(id, patch)` / `deleteWorkspace(id)`
   - `getActiveId() / setActiveId(id)` 操作 `localStorage['lifeos:active-workspace-id']`
   - `ensureBootstrapWorkspace()`:若 meta DB 空,生成 UUID 创建 `{ id: <uuid>, name: '默认空间', ... }`,并设为 active
4. **services/db.ts** 改造:
   - 删除 `const DB_PREFIX = 'lifeos-'`
   - 新增 `function dbPrefix(workspaceId: string)`(见 §1.1,统一 `lifeos-${uuid}-`)
   - `database: Database | null` → `databases: Map<string, Database>`
   - `initPromise` → `Map<string, Promise<Database>>`
   - `createCollection(name, prefix)`:接收 prefix 参数
   - `initDB(workspaceId)` / `getDB(workspaceId?)`:不传则使用当前激活空间(从 workspaces 服务读取)
   - 新增 `closeWorkspaceDB(workspaceId)`:对该空间所有 PouchDB 实例 `.close()`,从 Map 中删除
   - 注意:**保留对外 `getDB()` 无参签名**(向后兼容,18 个调用点可继续不改)
5. **plugins/pouchdb.client.ts** 调整:
   - 加载顺序:`clearLegacyDatabases`(扩展为同时清理 18 个 `lifeos-<collection>` 旧无前缀库)→ `ensureBootstrapWorkspace` → `initDB(activeId)`
   - **移除** `migrateAccountTypes` 函数与 `lifeos:account-type-migrated-v2` 标志(老数据被清理,无需迁移)
6. **冒烟测试**:在浏览器 console 跑:
   ```js
   const db1 = await __getDB('uuid-aaa')
   const db2 = await __getDB('uuid-bbb')
   await db1.bills.insert({ id: 'b1' /* ... */ })
   await db2.bills.insert({ id: 'b2' /* ... */ })
   // 各自独立,不互窜
   ```
   暴露 `window.__getDB = getDB` 仅在 dev 时方便手测,合并前删除。

**Success signal**:两个空间的 `bills.find()` 互不可见。

---

### Phase 2: 工作空间管理 UI(可与 Phase 3 并行,预估 4-6h)

**目标**:用户能创建、命名、切换至少 2 个空间。

**Tasks**:

7. **stores/workspace.ts**(Pinia):
   ```ts
   export const useWorkspaceStore = defineStore('workspace', () => {
     const list = ref<Workspace[]>([])
     const currentId = ref<string>('')   // 启动后由 plugin 注入实际 UUID
     const current = computed(() => list.value.find(w => w.id === currentId.value))
     async function load() { list.value = await listWorkspaces() }
     async function switchTo(id: string) {
       if (id === currentId.value) return
       await stopSync(currentId.value)         // Phase 3 实现
       closeWorkspaceDB(currentId.value)
       setActiveId(id)
       currentId.value = id
       await initDB(id)
       await startSync(id)                     // Phase 3 实现
     }
     async function create(input: { name: string; remoteUrl?: string }) { /* ... */ }
     async function update(id: string, patch: Partial<Workspace>) { /* ... */ }
     async function remove(id: string) { /* ... */ }
     return { list, currentId, current, load, switchTo, create, update, remove }
   })
   ```
8. **components/workspace/WorkspaceSwitcher.vue**:menubar 中显示当前空间名 + 下拉箭头 + 同步状态徽章。点击展开列表,选中切换;底部"管理空间"打开 Manager 弹窗。
9. **components/workspace/WorkspaceManagerDialog.vue**:列表 + 新建按钮 + 每行右侧"编辑/删除"。
10. **components/workspace/WorkspaceFormDialog.vue**:
    - 名称(必填)
    - CouchDB URL(可选,placeholder `https://user:pass@host:port`)
    - Remote prefix(默认 `lifeos-`)
    - "测试连接"按钮:`new PouchDB(url).info()` 成功显示绿色 ✅;失败显示错误文本。
11. **app.vue** 更新:
    - `<NuxtPage :key="workspaceStore.currentId" />`
    - menubar 右侧加 `<WorkspaceSwitcher />`
    - 引入 `<WorkspaceManagerDialog v-model:visible="..." />`(由 sidebar 设置或 switcher 触发)

**Success signal**:UI 上能创建空间 A 和 B,在 A 中加一笔账单,切到 B → 账单消失;切回 A → 账单回来。

---

### Phase 3: CouchDB 同步引擎(可与 Phase 2 并行,预估 4-6h)

**目标**:配置 remoteUrl 后双端实时同步。

**Tasks**:

12. **services/sync.ts**:
    ```ts
    interface SyncBundle {
      handles: Map<string, PouchDB.Replication.Sync<{}>>  // collection -> handle
      status: WorkspaceSyncStatus
      listeners: Set<(s: WorkspaceSyncStatus) => void>
    }
    const bundles = new Map<string, SyncBundle>()

    export async function startSync(workspaceId: string)
    export async function stopSync(workspaceId: string)
    export function subscribeStatus(workspaceId: string, fn: (s: WorkspaceSyncStatus) => void): () => void
    export function getStatus(workspaceId: string): WorkspaceSyncStatus
    ```
    - `startSync`:读 workspace.remoteUrl;为 18 个 collection 各 `localDb.sync(remoteDb, { live: true, retry: true, batch_size: 500, batches_limit: 5 })`;监听 `change/active/paused/error/denied/complete`,聚合到 `status`。
    - 错误处理:401 → state=error + lastError='认证失败';网络错误 → 自动 retry(PouchDB 内置)。
    - `stopSync`:`handle.cancel()` 全部并 await `complete`;清空 handles。
13. **composables/useSyncStatus.ts**:
    ```ts
    export function useSyncStatus(workspaceId?: MaybeRef<string>) {
      const id = computed(() => unref(workspaceId) ?? useWorkspaceStore().currentId)
      const status = ref<WorkspaceSyncStatus>(getStatus(id.value))
      let unsubscribe: (() => void) | null = null
      watchEffect(() => {
        unsubscribe?.()
        unsubscribe = subscribeStatus(id.value, s => { status.value = s })
      })
      onUnmounted(() => unsubscribe?.())
      return { status }
    }
    ```
14. **components/workspace/SyncStatusBadge.vue**:小圆点 + tooltip
    - `idle`:灰色 ✓"已同步"
    - `active`:蓝色脉冲 "同步中…"
    - `paused`:浅灰 (短时间内会变 idle)
    - `error`:红色 ! tooltip 显示 lastError
    - `disabled`:无色 "未配置同步"
15. **plugins/workspace.client.ts**:启动时若当前空间有 remoteUrl,自动 `startSync(activeId)`。
16. **stores/workspace.ts.switchTo()** 接入 `stopSync(prev)` / `startSync(next)`(占位已在 Phase 2 写好)。

**Success signal**:Mac 浏览器配 URL 后看到 active→idle;手机端配同 URL,在 Mac 加一笔账单,手机 5-10s 内出现。

---

### Phase 4: 数据层适配(预估 2-3h)

**目标**:14 个 composable 切换空间后正确读新空间数据,无残留。

**Tasks**:

17. **批量删除 9 个 composable 中的 `let dbRef: any = null` 与 `getDb()` wrapper**,直接 `const db = await getDB()`。文件清单见 §2.2 末尾。
18. **代码搜索校验**:
    ```bash
    grep -rn "dbRef\|let db: any = null" composables/ app-modules/
    ```
    应返回空(useBlockEditor 内部局部 `let db` 保留,识别区分)。
19. **页面冒烟**:在 A 空间打开 `/billing` → `/notes` → `/todo`,切到 B 空间 → 三个页面分别再次打开,各自独立。
20. **边界**:在 sync 进行中切空间 → `stopSync` 必须 await,否则旧 sync 写到新前缀的 db。在 `WorkspaceStore.switchTo` 中 await。

**Success signal**:切换空间无任何旧数据闪烁,主菜单 3 个模块全部正常。

---

### Phase 5: 集成测试 + 调优 + 收尾(预估 4-6h)

21. **手动测试矩阵**:

    | 场景 | 期望 |
    |---|---|
    | 全新启动(无 meta DB) | 自动创建 UUID 空间"默认空间",无同步 |
    | 启动时检测到旧的 `lifeos-<collection>` 库 | `clearLegacyDatabases` 清理掉,IndexedDB 干净 |
    | 创建空间 B → 输入有效 URL | active→idle,远端 db 自动创建(或提示) |
    | 输入无效 URL(4xx) | error + 错误提示 |
    | 输入 401 凭证错 | error + "认证失败" |
    | 离线 → 在线 | 自动 retry 恢复同步 |
    | 双端同时改同一笔账单 | last-write-wins,无报错 |
    | 删除当前空间 | 阻止(必须先切到其他空间);删除非当前空间 → confirm → 销毁 IndexedDB |
    | 导入 CSV 后切空间再切回 | 批次和账单完整保留 |

22. **性能调优**:
    - 初始全量同步用 `batch_size: 500` / `batches_limit: 5`(写入大库时必要)
    - 单个 workspace 18 个 sync 并发 → CouchDB 自托管单实例可承受,移动端注意 fetch 并发上限(浏览器默认 6 connections per origin,18 个 sync 内部会排队,无需额外节流)
    - IndexedDB 存储上限:Chrome 桌面 50%-60% 磁盘,移动端 ~6%。提示用户"3 个以上空间且每个 ≥10000 文档时关注"。
23. **删除遗留代码**:
    - `composables/useOfflineSync.ts`
    - `server/api/{notes,blocks,folders,tags}/*`(grep 确认无引用)
    - 调用方(主要在 pages/notes.vue?)同步替换或删除。
24. **文档**:更新 `CLAUDE.md` 添加「工作空间章节」:所有空间统一 UUID 前缀、meta DB 不走 prefix、composables 不再缓存 dbRef、forced-remount key 策略。
25. **commit**:按项目规范分多次提交(Phase 1 一次,UI 一次,Sync 一次,适配清理一次)。

**Success signal**:三端实测一致;切换空间流畅 (<500ms);未配置同步的空间使用无任何性能/UI 退化。

---

## 4. Risk Register(风险登记)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 切换空间瞬间旧 sync 仍在写入 | 中 | 中 | `switchTo` 严格 await `stopSync`,handle.cancel() 后 await complete 事件 |
| 旧 dbRef 引用泄漏(组件未销毁就切空间) | 中 | 高 | `<NuxtPage :key>` 强制 remount + `closeWorkspaceDB` 关闭旧 PouchDB 实例 |
| pouch 单实例多次 new 冲突 | 低 | 中 | `getDB` 内 Map 单例化,`closeWorkspaceDB` 调用后从 Map 中 delete |
| pouchdb-find sort 时索引未建好 | 低 | 中 | 现有 `indexesReady` 机制已经保证,新空间走同样路径 |
| CouchDB 远端 db 不存在 → 同步报 404 | 高 | 低 | 启动 sync 前先 `new PouchDB(remote).info()`,失败则 `PUT` 创建,或 `skip_setup: false`(默认) |
| 18 个并发 sync 在弱网阻塞 UI | 中 | 中 | sync 全部异步,不阻塞主线程;若需要可以延迟 5s 启动给 UI 让位 |
| meta DB 损坏导致空间列表丢失 | 极低 | 高 | 启动时 try/catch,损坏时降级为重新生成一个 UUID 引导空间;不影响业务 db |
| 删除空间时未清理 IndexedDB | 中 | 低 | `deleteWorkspace` 内对 18 个 collection `pdb.destroy()`(异步) |
| `useBlockEditor` 内的 `let db` 局部变量 | 低 | 低 | 是函数内变量(每次调用 `useBlockEditor()` 都新建),不共享,无问题。保留 |
| 旧 server/api REST 端点被某处调用 | 中 | 中 | grep `\$fetch.*\`/api/(notes\|blocks\|folders\|tags)` 全量确认 |
| 用户密码以明文存于 IndexedDB | 中 | 中 | PRD 已明确 v1 不加密;在 README/CLAUDE.md 强提示;建议自托管走 https |

---

## 5. Out of Scope(明确不做)

- 多人协作冲突合并 UI
- 端到端加密 / 凭证保险柜
- 空间间数据迁移/复制
- 移动端原生 App
- CouchDB 远程库自动 provisioning(只做存在性检查 + 单库 PUT,不做复杂权限/索引推送)
- 备份/导出空间到本地文件(独立功能,后续 PRD)

---

## 6. Estimated Complexity & Effort

| 维度 | 评估 |
|---|---|
| 总体复杂度 | **MEDIUM-HIGH** |
| 涉及文件数 | 新增 11 + 修改 ~15 |
| 主要风险 | 单例重建、composable 缓存清理、sync 与切换的时序 |
| 预估总工时 | **20-30 小时**(含测试) |
| 推荐分阶段 PR | Phase 1+4 一个 PR(纯重构);Phase 2+3 一个 PR(功能);Phase 5 一个 PR(清理+文档) |
| 是否建议新分支 | 是,建议 `feat/workspaces-couchdb-sync` |

---

## 7. Validation Strategy

- **单元层面**:无强制单元测试要求(项目当前无 vitest 配置),但建议 Phase 1 完成后写一个临时脚本 `scripts/smoke-workspaces.ts` 跑两个空间隔离写入。
- **集成层面**:`npm run typecheck` 必过;`npm run dev` 启动后人工跑测试矩阵 §5.21。
- **端到端**:Mac + 手机 Chrome 实测同一 CouchDB 端,5 项数据增删改各验一次。
- **回归**:CSV 导入、规则引擎、NotePicker 等近期功能在引导空间(默认空间)中不受影响。

---

## 8. Confirmation Checklist

已确认的关键决策:

- [x] **所有空间一律 UUID 前缀**(`lifeos-<uuid>-`),开发阶段丢弃旧 `lifeos-<collection>` 库,首启自动创建一个名为"默认空间"的 UUID 工作空间
- [x] **元数据 DB(`lifeos-meta-workspaces`)不参与 CouchDB 同步**,每台设备本地独立维护空间列表与凭证
- [x] **整页强制 remount** 用于切换刷新(不挨个改 composable 的响应式监听)
- [x] **直接删除 `useOfflineSync.ts` 与 server REST 端点**,不保留兼容
- [x] **凭证明文存 IndexedDB**,v1 不加密
- [x] **Pinia 作为状态层**(`stores/workspace.ts`)
- [x] **顶栏 menubar 嵌入 WorkspaceSwitcher**,设置入口同时支持打开 Manager
- [x] **目标分支 `feat/workspaces-couchdb-sync`**,从 main 切

**STATUS**: 方案已确认,可以开始 Phase 1 实施。
