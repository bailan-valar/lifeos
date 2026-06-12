# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

**语言设置：请始终使用中文回复用户。**

## 项目概述

LifeOS 是基于 Nuxt 3 构建的个人信息操作系统，采用模块化笔记设计，内嵌记账和待办功能。使用 PouchDB 实现本地优先的数据存储，支持通过 CouchDB 进行多设备同步。

## 架构说明

### 模块系统

应用采用**模块化架构**，功能（记账、待办）作为独立模块实现，可按笔记启用：

- **模块定义**：通过 `services/ModuleRegistry.ts` 中的 `getModuleRegistry()` 注册
- **模块结构**：每个模块位于 `app-modules/<name>/`，包含：
  - `index.ts` - 模块注册和配置
  - `<Name>View.vue` - 主模块组件
  - `components/` - 模块专属组件
  - `composables/` - 模块专属组合式函数
- **模块数据**：存储在 `module_config` 和 `module_data` 集合中，以 `noteId` 为键

### 数据层 (PouchDB)

**多工作空间架构：**
- 每个工作空间是一个 UUID，拥有隔离的 PouchDB 数据库
- 数据库命名：IndexedDB 中为 `lifeos-<workspaceId>-<collection>`
- 元数据库：`lifeos-meta-workspaces`（存储工作空间列表，不参与同步）
- 当前激活工作空间存储在 localStorage：`lifeos:active-workspace-id`

**集合**（每个工作空间 18 个）：
- 核心：`notes`、`blocks`、`folders`、`tags`、`noteTags`、`blockLinks`
- 记账：`bills`、`accounts`、`billCategories`、`budgets`、`statements`、`importRules`、`importRecords`、`balanceAdjustments`
- 系统：`module_config`、`module_data`、`classes`、`classFields`、`noteClassBindings`、`goals`

**关键模式：**
- 所有 composables 使用 `const db = await getDB()` - 不缓存 `dbRef`（工作空间感知）
- `_id` 格式：`{collection}/{businessId}` 保证全局唯一
- 变更订阅：`onCollectionChange()` 用于集合的响应式更新
- 使用 `services/db.ts` 中的 `generateId()` 和 `now()` 生成 ID 和时间戳

### 状态管理 (Pinia)

- `stores/workspace.ts` - 当前工作空间、工作空间列表、同步状态
- `stores/billing.ts` - 记账模块导航、筛选、视图模式
- `stores/pageHeader.ts` - 动态页面头部操作
- `stores/auth.ts` - 认证状态

### Composables 模式

`composables/` 中的全局组合式函数提供数据访问：
- `useBills()` - 账单 CRUD（带分页）
- `useAccounts()` - 账户管理
- `useBillCategories()` - 分类树操作
- `useBudgets()` - 预算（按月等效计算）
- `useStatements()` - 银行对账单
- `useImportRules()` - CSV 导入规则匹配
- `useNotes()` - 笔记和块操作
- `useWorkspace()` - 工作空间 CRUD 和切换

**重要**：永远不要在 composables 中缓存 `db` 引用 - 始终直接调用 `await getDB()`。

### Store 单例自动加载模式

全局 composables（如 `useAccounts`、`useBillCategories`、`useBudgets` 等）采用**模块级单例**模式。数据加载遵循以下规则：

**规则 1：首次创建时自动加载**

Store 在 `useXxx()` 首次调用时自动触发 `loadXxx()`，组件无需手动调用加载方法：

```typescript
// composables/useXxx.ts
export function useXxx(): XxxStore {
  if (!_store) {
    _store = createStore()
    startWatchingXxx()
    _store.loadXxx()  // 自动初始加载
  }
  return _store
}
```

**规则 2：增量更新由 onCollectionChange 自动处理**

数据库变更（增删改）通过 `onCollectionChange` 订阅自动刷新 store，组件不需要在保存/删除后手动调用 `loadXxx()`：

```typescript
// ❌ 错误：手动刷新已由响应式机制处理
await updateBill(id, data)
await loadAccounts()  // 多余！onCollectionChange 已自动触发

// ✅ 正确：直接使用，store 会自动更新
await updateBill(id, data)
// accounts ref 自动响应更新
```

**规则 3：组件只消费响应式数据**

组件解构 store 后直接使用响应式数据，不需要手动加载：

```typescript
// ✅ 正确：store 自动加载，直接消费
const { accounts } = useAccounts()
const { categories } = useBillCategories()

// ❌ 错误：不要手动调 loadXxx()
const { accounts, loadAccounts } = useAccounts()
await loadAccounts()  // 多余！store 创建时已自动加载
```

**例外**：页面维度的数据加载（如 `loadBillsByAccount(accountId)` 需要特定参数）仍需组件手动调用，因为需要传入查询参数。

### 同步架构

- **按工作空间同步**：每个工作空间有 18 个独立的 PouchDB 复制句柄
- **同步服务**：`services/sync.ts` 管理同步生命周期和状态聚合
- **状态**：`disabled`（未配置）→ `active`（同步中）→ `idle`（已同步）/ `error`
- **凭证**：存储在工作空间配置中（明文，v1 版本 - 假设自托管 HTTPS）
- **元同步**：工作空间列表通过 `services/workspaces.ts` 的 `startMetaSync()` 同步

### 组件模式

### Tiptap 块编辑器

- 富文本编辑在 `composables/useBlockEditor.ts` 中
- 块类型的自定义扩展
- 文档结构存储为 `blocks` 集合，具有父子关系

## 文件结构说明

- `app-modules/` - 功能模块（记账、待办）
- `components/` - 共享 UI 组件
- `composables/` - 全局数据访问 composables
- `pages/` - 路由页面（index、notes、billing、todo、time、login、signup）
- `plugins/` - Nuxt 插件（auth、pouchdb、workspace 初始化）
- `services/` - 核心业务逻辑（db、sync、workspaces、module registry）
- `stores/` - Pinia stores
- `types/` - TypeScript 定义

## 环境变量

在 `.env` 或 `nuxt.config.ts` 中设置：
- `NUXT_PUBLIC_COUCHDB_URL` - 远程 CouchDB 基础 URL
- `NUXT_PUBLIC_COUCHDB_USERNAME` - CouchDB 认证用户名
- `NUXT_PUBLIC_COUCHDB_PASSWORD` - CouchDB 认证密码
- `NUXT_PUBLIC_COUCHDB_PREFIX` - 远程数据库名前缀（默认：`lifeos-`）

## 重要约束

- **不缓存 dbRef**：Composables 必须每次调用 `getDB()`，不能缓存结果
- **工作空间隔离**：所有数据操作都限定在当前激活工作空间
- **模块注册**：模块必须先注册才能按笔记启用
- **同步取消**：切换工作空间前必须 `await stopSync()`
- **强制重新挂载**：`<NuxtPage :key="workspaceStore.currentId">` 确保工作空间切换时干净重载
- **禁止自动启动开发服务器**：不要自动运行 `npm run dev` 或 `pnpm dev`，用户会自行启动开发服务器

## 样式规范：iOS 26 Liquid Glass

### 设计系统

项目采用 iOS 26 Liquid Glass 设计语言，所有样式变量定义在 `assets/css/main.css` 中。

### 核心原则

**禁止硬编码样式值**：所有颜色、模糊度、圆角、阴影等必须使用 CSS 变量。

### CSS 变量速查

| 类别 | 变量 | 值 |
|------|------|-----|
| 模糊 | `--liquid-blur` | 20px |
| 模糊-导航 | `--liquid-blur-nav` | 24px |
| 模糊-加厚 | `--liquid-blur-thick` | 32px |
| 饱和度 | `--liquid-saturate` | 180% |
| 背景-标准 | `--liquid-bg` | rgba(255,255,255,0.15) |
| 背景-加厚 | `--liquid-bg-thick` | rgba(255,255,255,0.22) |
| 背景-薄 | `--liquid-bg-thin` | rgba(255,255,255,0.10) |
| 圆角-标准 | `--liquid-radius` | 20px |
| 圆角-按钮 | `--liquid-radius-button` | 14px |

### 组件类名

- `.liquid-glass` - 标准玻璃效果
- `.liquid-glass-thick` / `.liquid-glass-thin` - 加厚/薄玻璃
- `.liquid-glass-nav` - 导航栏
- `.liquid-glass-card` - 卡片
- `.liquid-glass-sidebar` - 侧边栏
- `.liquid-glass-button` - 按钮
- `.liquid-glass-input` - 输入框
- `.liquid-glass-select` - 下拉选择框
- `.liquid-glass-dialog` - 弹框
- `.liquid-glass-sheet` - 底部弹层
- `.liquid-glass-refraction` - 折射高光（组合类）

### 基础组件

#### BaseDialog

通用弹窗组件，支持手机与 Web 双端自适应。

**必须复用此组件**：所有新弹窗必须使用 `BaseDialog`，禁止自行实现 Teleport + overlay + transition 弹框。特殊布局需求通过 `header` / `default` / `footer` 插槽自定义。

**位置**：`components/ui/BaseDialog.vue`

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | - | 是否显示（支持 v-model） |
| `title` | `string` | - | 标题 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 宽度：400/520/680px |
| `showClose` | `boolean` | `true` | 显示关闭按钮 |
| `closeOnOverlay` | `boolean` | `true` | 点击遮罩关闭 |
| `closeOnEsc` | `boolean` | `true` | ESC 键关闭 |
| `closeIconSize` | `string \| number` | `20` | 关闭图标大小 |

**插槽：**
| 插槽名 | 说明 |
|--------|------|
| `header` | 自定义头部（替代 title） |
| `default` | 主内容区 |
| `footer` | 底部操作区 |

**使用示例：**
```vue
<script setup lang="ts">
const visible = ref(false)
const formData = ref({ name: '' })

function open() {
  visible.value = true
}

function onConfirm() {
  // 处理逻辑
  visible.value = false
}
</script>

<template>
  <button @click="open">打开弹窗</button>

  <BaseDialog v-model:visible="visible" title="创建项目" size="medium">
    <div class="form-group">
      <label>项目名称</label>
      <input v-model="formData.name" type="text" class="liquid-glass-input" placeholder="请输入" />
    </div>

    <template #footer>
      <button class="liquid-glass-button" @click="visible = false">取消</button>
      <button class="liquid-glass-button liquid-glass-button-primary" @click="onConfirm">确认</button>
    </template>
  </BaseDialog>
</template>
```

**双端自适应**：移动端自动底部弹出，桌面端居中显示。

#### BillPicker

可复用的账单选择器组件，支持搜索和多条件筛选，内部复用 `BillListItem` 展示。

**位置**：`app-modules/billing/components/BillPicker.vue`

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `string \| null` | `null` | 选中账单ID |
| `filter` | `BillPickerFilter` | `{}` | 筛选条件 |
| `emptyText` | `string` | `'没有可选择的账单'` | 空状态文案 |

**BillPickerFilter：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `noteId` | `string` | 限定笔记 |
| `type` | `BillType` | 限定账单类型 |
| `excludeIds` | `string[]` | 排除的账单ID |
| `excludeRefund` | `boolean` | 排除退款账单 |
| `excludeChild` | `boolean` | 排除子账单 |
| `excludeCancelled` | `boolean` | 排除已取消账单 |

**搜索支持**：描述、金额、分类名、账户名模糊匹配。

**使用示例：**
```vue
<BillPicker
  :model-value="selectedId"
  :filter="{ noteId: currentNoteId, type: 'income', excludeRefund: true }"
  @select="handleBillSelect"
/>
```

### 使用示例

```html
<!-- 按钮 -->
<button class="liquid-glass-button">取消</button>
<button class="liquid-glass-button liquid-glass-button-primary">确认</button>

<!-- 输入框 -->
<input type="text" class="liquid-glass-input" placeholder="请输入..." />
<textarea class="liquid-glass-input" rows="3" placeholder="多行文本"></textarea>

<!-- 下拉选择框 -->
<select class="liquid-glass-select">
  <option value="">请选择</option>
  <option value="option1">选项1</option>
  <option value="option2">选项2</option>
</select>

<!-- 卡片 -->
<div class="liquid-glass-card">
  <p>内容</p>
</div>

<!-- 带高光的侧边栏 -->
<aside class="liquid-glass-sidebar liquid-glass-refraction">
  <nav>...</nav>
</aside>
```

### 样式约束

```css
/* ❌ 错误：硬编码 */
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
border-radius: 20px;

/* ✅ 正确：使用变量 */
background: var(--liquid-bg);
backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
border-radius: var(--liquid-radius);
```

### 下拉选择框规范

**推荐使用 `SelectPicker` 组件**，提供更好的交互体验：

```vue
<!-- ✅ 推荐：SelectPicker 组件 -->
<SelectPicker
  v-model="selectedValue"
  :options="[
    { label: '选项1', value: '1' },
    { label: '选项2', value: '2' }
  ]"
  placeholder="请选择"
  searchable
  clearable
/>

<!-- 可选：原生 select 使用标准类名 -->
<select class="liquid-glass-select">
  <option>选项</option>
</select>
```

**SelectPicker 组件特性：**
- 智能定位（自动上下展开，防止溢出）
- 键盘导航（↑↓ 选择、Enter 确认、Esc 关闭）
- 搜索过滤（`searchable` 属性）
- 清除选择（`clearable` 属性）
- 选项禁用支持（`disabled` 字段）
- 深色模式自适应

**Props：**
| 属性 | 类型 | 默认值 |
|------|------|--------|
| `modelValue` | `string \| number \| null` | - |
| `options` | `SelectOption[]` | - |
| `placeholder` | `string` | "请选择" |
| `searchable` | `boolean` | false |
| `clearable` | `boolean` | false |
| `disabled` | `boolean` | false |
| `valueKey` | `string` | "value" |
| `labelKey` | `string` | "label" |

**SelectOption 类型：**
```ts
interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}
```

### 深色模式

深色模式通过 `@media (prefers-color-scheme: dark)` 自动切换变量值，组件无需额外处理。

详细规范见 [STYLE_GUIDE.md](STYLE_GUIDE.md)

## 图标使用规范

项目使用 `@nuxt/icon` + `@iconify-json/solar`，Solar 图标集已本地安装。

### 核心原则

**禁止硬编码图标名称字符串**：必须使用 `composables/useIcons.ts` 中定义的图标常量。

### 使用方式

```vue
<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
</script>

<template>
  <!-- 方式1: 使用扁平常量 -->
  <Icon :name="ICONS.addCircle" />

  <!-- 方式2: 使用分类常量（推荐） -->
  <Icon :name="SOLAR_ICONS.action.add" />
  <Icon :name="SOLAR_ICONS.editor.bold" />
  <Icon :name="SOLAR_ICONS.nav.back" />
</template>
```

### 图标分类

`SOLAR_ICONS` 按功能分类组织：

| 分类 | 说明 | 示例 |
|------|------|------|
| `editor` | 文本编辑 | `bold`, `italic`, `underline`, `strikeThrough` |
| `action` | 通用操作 | `add`, `edit`, `delete`, `save` |
| `nav` | 导航箭头 | `back`, `forward`, `up`, `down` |
| `doc` | 文档相关 | `default`, `text`, `notebook` |
| `search` | 搜索 | `default`, `minimal` |
| `settings` | 设置/认证 | `gear`, `login`, `logout` |
| `status` | 状态指示 | `success`, `error`, `warning` |

### 约束

```html
<!-- ❌ 错误：硬编码图标名称 -->
<Icon name="solar:add-circle-linear" />
<Icon :name="`solar:${iconName}-linear`" />

<!-- ✅ 正确：使用常量 -->
<Icon :name="SOLAR_ICONS.action.add" />
<Icon :name="ICONS.addCircle" />
```

### 添加新图标

1. 在 https://icones.js.org/ 搜索验证图标名称
2. 在 `composables/useIcons.ts` 中添加常量
3. IDE 自动在所有文件中可用

详细图标列表见 [composables/useIcons.ts](composables/useIcons.ts)

## 确认框使用规范

**禁止使用原生 `confirm()`**：原生 `confirm()` 会阻塞主线程，触发 Chrome `[Violation] 'click' handler took ...ms` 性能警告，且无法在样式上保持与项目设计系统一致。

**必须使用 `useConfirm()` composable**：项目已在 `app.vue` 中全局挂载 `<ConfirmDialog />`，任何地方都可以直接调用。

### 使用方式

```vue
<script setup lang="ts">
const { confirm } = useConfirm()

async function handleDelete(item: SomeItem) {
  const ok = await confirm({
    message: `确定要删除 "${item.name}" 吗？`,
    danger: true
  })
  if (!ok) return
  // 执行删除
}
</script>
```

### API

```ts
interface ConfirmOptions {
  title?: string        // 标题（可选）
  message: string       // 正文（必填）
  confirmText?: string  // 确认按钮文字，默认"确定"
  cancelText?: string   // 取消按钮文字，默认"取消"
  danger?: boolean      // 是否为危险操作，红色按钮
}

const { confirm } = useConfirm()
confirm(options: ConfirmOptions | string): Promise<boolean>
```

### 约束

```ts
// ❌ 错误：使用原生 confirm
if (confirm('确定删除吗？')) { ... }

// ✅ 正确：使用 useConfirm
const ok = await confirm({ message: '确定删除吗？', danger: true })
if (!ok) return
```

- 危险操作（删除、重置等）必须设置 `danger: true`
- 取消时提前 `return`，减少嵌套层级
- 支持传入字符串简写：`confirm('确定删除吗？')`

## Git Hooks 配置

### 自动生成 Changelog

项目配置了 Git push 前自动生成 changelog，通过 Claude Code 的 hooks 系统实现。

**配置文件**：`.claude/settings.json`

```json
{
  "hooks": {
    "GitPush": {
      "after": [
        {
          "skill": "changelog-from-git",
          "prompt": "分析自上次 changelog 更新以来的所有提交，生成面向用户的更新日志。"
        }
      ]
    }
  }
}
```

**工作流程**：
1. 执行 `git push` 时，自动触发 `changelog-from-git` skill
2. 读取 `.changelog-baseline` 获取基准提交（首次运行自动检测）
3. 分析基准提交到 HEAD 之间的所有提交
4. 按类型分组：`feature`（新功能）、`fix`（修复）、`improvement`（改进）、`breaking`（破坏性变更）
5. 转换为面向用户的描述语言，避免技术细节
6. 询问版本号和发布日期，确认后插入数据库
7. 成功后更新 `.changelog-baseline` 为当前 HEAD

**注意事项**：
- 如果没有新提交，skill 会自动终止
- 纯内部提交（如注释修正、CI 配置）会被跳过
- 需要用户确认版本号和 changelog 内容后才插入数据库
- 仅在数据库插入成功后才更新基准文件，确保幂等性

**手动触发**：
```bash
# 直接调用 skill
/changelog-from-git
```

## Loading 状态使用规范

**核心原则**：loading 状态应该只在**用户感知的数据加载等待**时显示，避免不必要的闪烁。

### 需要显示 loading 的场景

| 场景 | 是否显示 loading | 说明 |
|------|------------------|------|
| 页面初始加载 | **是** | 首次进入页面，数据未加载 |
| 切换时间范围 | **是** | 用户主动触发（如切换周、月） |
| 切换工作空间 | **是** | 完整的数据重新加载 |
| 刷新/重置操作 | **是** | 用户主动点击刷新按钮 |
| 远程数据请求 | **是** | 网络请求，有感知延迟 |

### 不需要显示 loading 的场景（使用静默模式）

| 场景 | 是否显示 loading | 说明 |
|------|------------------|------|
| 本地 CRUD 后刷新 | **否** | 增删改后通过 `onCollectionChange` 自动刷新 |
| 拖拽操作后刷新 | **否** | 拖拽是即时交互，不应有 loading 闪烁 |
| 右键菜单打开 | **否** | 数据已存在于内存，直接使用 |
| 编辑对话框打开 | **否** | 从已有数据构造，无需额外查询 |
| 数据库变更订阅 | **否** | 通过 `loadData(true)` 静默模式 |

### 实现模式

**静默加载**：composable 提供 `silent` 参数
```ts
// useTodoProjectView.ts
async function loadData(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true  // 只在非静默模式显示 loading
  }
  // ... 数据加载
  loading.value = false
}

// 订阅变更时使用静默模式
function subscribeChanges(): void {
  onCollectionChange('module_data', () => loadData(true))
}
```

**编辑对话框数据来源**：直接从已加载数据获取
```ts
// ✅ 正确：从内存数据获取
function handleTaskMenuEdit(task) {
  editingTask.value = {
    id: task.id,
    text: task.text,
    // ... 直接使用已有数据
  }
  showEditDialog.value = true
}

// ❌ 错误：重新查询数据库
async function handleTaskMenuEdit(task) {
  const db = await getDB()
  const taskDoc = await db.module_data.findOne(task.id).exec()
  // ... 这样会导致不必要的 loading
}
```

### 保存操作的数据刷新

**重要**：保存后**不要手动调用** `loadData()`。

```ts
// ✅ 正确：保存后让 onCollectionChange 自动刷新
await doc.patch({ data: { todos: data.todos } })
// 不需要调用 loadData()，onCollectionChange 会自动触发 loadData(true)

// ❌ 错误：手动调用 loadData 会显示不必要的 loading
await doc.patch({ data: { todos: data.todos } })
await loadData()  // 会导致 loading 闪烁，且与 onCollectionChange 重复刷新
```

**原理**：`subscribeChanges()` 已订阅所有相关集合的变更：
```ts
function subscribeChanges(): void {
  onCollectionChange('notes', () => loadData(true))
  onCollectionChange('module_data', () => loadData(true))      // 待办数据变更
  onCollectionChange('classes', () => loadData(true))
  onCollectionChange('noteClassBindings', () => loadData(true))
}
```

任何对数据库的修改都会自动触发**静默刷新**，无需手动干预。
