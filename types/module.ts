/**
 * 模块状态
 */
export type ModuleStatus = 'enabled' | 'disabled' | 'error'

/**
 * 模块生命周期钩子
 */
export interface ModuleHooks {
  /**
   * 模块加载前调用
   */
  onLoad?: (noteId: string) => Promise<void> | void
  /**
   * 模块卸载前调用
   */
  onUnload?: (noteId: string) => Promise<void> | void
  /**
   * 笔记切换到该模块时调用
   */
  onActivate?: (noteId: string) => Promise<void> | void
  /**
   * 笔记从该模块切换走时调用
   */
  onDeactivate?: (noteId: string) => Promise<void> | void
  /**
   * 模块数据更新时调用
   */
  onDataChange?: (noteId: string, data: unknown) => Promise<void> | void
}

/**
 * 模块数据迁移
 */
export interface ModuleMigration {
  version: number
  description: string
  migrate: (data: unknown) => unknown
}

/**
 * 模块配置
 */
export interface ModuleConfig {
  /**
   * 模块 ID（唯一标识）
   */
  id: string
  /**
   * 模块显示名称
   */
  name: string
  /**
   * 模块图标
   */
  icon: string
  /**
   * 模块描述
   */
  description?: string
  /**
   * 模块版本
   */
  version: string
  /**
   * 模块组件路径（相对于 modules 目录）
   */
  component: string
  /**
   * 模块 Composable 路径
   */
  composable?: string
  /**
   * Schema 定义（保留字段，无运行时校验）
   */
  schema?: Record<string, unknown>
  /**
   * 数据迁移列表
   */
  migrations?: ModuleMigration[]
  /**
   * 生命周期钩子
   */
  hooks?: ModuleHooks
  /**
   * 依赖的其他模块 ID
   */
  dependencies?: string[]
  /**
   * 默认是否启用
   */
  defaultEnabled?: boolean
  /**
   * 模块权限配置
   */
  permissions?: string[]
}

/**
 * 模块实例
 */
export interface Module {
  id: string
  name: string
  icon: string
  description?: string
  version: string
  status: ModuleStatus
  component: string
  composable?: string
  schema?: Record<string, unknown>
  migrations?: ModuleMigration[]
  hooks?: ModuleHooks
  dependencies?: string[]
  defaultEnabled?: boolean
  permissions?: string[]
  /**
   * 模块是否已加载
   */
  loaded: boolean
  /**
   * 模块加载错误信息
   */
  error?: string
}

/**
 * 模块数据存储结构
 */
export interface ModuleData {
  id: string
  noteId: string
  moduleId: string
  data: unknown
  createdAt: string
  updatedAt: string
  version: number
}

/**
 * 模块配置存储结构
 */
export interface ModuleConfigData {
  id: string
  noteId: string
  moduleId: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 模块注册表接口
 */
export interface ModuleRegistry {
  /**
   * 注册模块
   */
  register(moduleConfig: ModuleConfig): void
  /**
   * 注销模块
   */
  unregister(moduleId: string): void
  /**
   * 获取模块
   */
  get(moduleId: string): Module | undefined
  /**
   * 获取所有模块
   */
  getAll(): Module[]
  /**
   * 获取已启用的模块（针对特定笔记）
   */
  getEnabled(noteId: string): Module[]
  /**
   * 检查模块是否已启用
   */
  isEnabled(moduleId: string, noteId: string): boolean
  /**
   * 启用模块
   */
  enable(moduleId: string, noteId: string): Promise<void>
  /**
   * 禁用模块
   */
  disable(moduleId: string, noteId: string): Promise<void>
  /**
   * 获取模块数据
   */
  getModuleData(moduleId: string, noteId: string): Promise<unknown>
  /**
   * 保存模块数据
   */
  saveModuleData(moduleId: string, noteId: string, data: unknown): Promise<void>
}

/**
 * 模块加载器接口
 */
export interface ModuleLoader {
  /**
   * 加载模块组件
   */
  loadComponent(module: Module): Promise<unknown>
  /**
   * 加载模块 Composable
   */
  loadComposable(module: Module): Promise<((noteId: string) => unknown) | undefined>
  /**
   * 预加载模块
   */
  preload(moduleIds: string[]): Promise<void>
  /**
   * 卸载模块
   */
  unload(moduleId: string): void
}

/**
 * 模块基础 Props
 */
export interface ModuleBaseProps {
  noteId: string
  moduleData?: unknown
  onDataChange?: (data: unknown) => void
}

/**
 * 模块基础 Emits
 */
export interface ModuleBaseEmits {
  (e: 'ready'): void
  (e: 'error', error: Error): void
  (e: 'data-change', data: unknown): void
}

/**
 * 模块 Composable 返回值
 */
export interface ModuleComposableReturn {
  /**
   * 模块数据
   */
  data: Ref<unknown>
  /**
   * 模块加载状态
   */
  loading: Ref<boolean>
  /**
   * 模块错误信息
   */
  error: Ref<string | null>
  /**
   * 初始化模块
   */
  init: () => Promise<void>
  /**
   * 销毁模块
   */
  destroy: () => Promise<void>
  /**
   * 保存数据
   */
  save: (data: unknown) => Promise<void>
  /**
   * 刷新数据
   */
  refresh: () => Promise<void>
}

/**
 * 笔记的 Tab 配置
 */
export interface NoteTab {
  /**
   * Tab ID（通常是模块 ID）
   */
  id: string
  /**
   * Tab 显示名称
   */
  name: string
  /**
   * Tab 图标
   */
  icon: string
  /**
   * Tab 顺序
   */
  order: number
  /**
   * 是否为默认 Tab
   */
  isDefault?: boolean
  /**
   * 是否禁用
   */
  disabled?: boolean
}

/**
 * 模块管理器状态
 */
export interface ModuleManagerState {
  /**
   * 所有模块
   */
  allModules: Module[]
  /**
   * 当前笔记已启用的模块
   */
  enabledModules: Module[]
  /**
   * 当前笔记的 Tab 列表
   */
  tabs: NoteTab[]
  /**
   * 当前激活的 Tab
   */
  activeTabId: string
  /**
   * 加载状态
   */
  loading: boolean
}
