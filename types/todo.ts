export interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface TodoStatus {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  order: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  startDate?: string // 开始时间，格式: "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"
  dueDate?: string // 截止时间，格式: "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"
  typeId?: string // 待办类型ID
  statusId?: string // 待办状态ID
  priority?: 'none' | 'low' | 'medium' | 'high'
  parentId?: string // 父任务ID，用于支持父子任务
  noteId?: string // 绑定笔记ID
}

// 树形节点类型，用于UI展示
export interface TodoTreeNode extends TodoItem {
  hasChildren?: boolean
  level?: number // 层级深度，0为根任务
  children?: TodoTreeNode[]
}

export interface TodoStatusFormData {
  name: string
  icon: string
  color: string
  description?: string
  isDefault?: boolean
}

export interface TodoTypeFormData {
  name: string
  icon: string
  color: string
  description?: string
}

// ==================== 视图相关类型 ====================

export type ViewMode = 'all' | 'today' | 'week' | 'project' | 'overdue' | 'important'
export type GroupBy = 'none' | 'date' | 'note' | 'status' | 'priority'
export type SortBy = 'created' | 'dueDate' | 'priority' | 'name'

export interface TodoWithMeta extends TodoItem {
  noteId: string
  noteTitle?: string
  statusName?: string
  statusColor?: string
  statusIcon?: string
  typeName?: string
  typeColor?: string
  typeIcon?: string
}

export interface TaskGroup {
  id: string
  title: string
  count: number
  completedCount: number
  tasks: TodoWithMeta[]
}

export interface ViewFilters {
  status: string[]
  type: string[]
  search: string
}