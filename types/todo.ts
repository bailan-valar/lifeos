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
  isCompleted: boolean // 标记此状态是否表示完成
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  text: string
  description?: string // 详细描述
  completed: boolean
  createdAt: string
  startDate?: string // 开始时间，格式: "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"
  dueDate?: string // 截止时间，格式: "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"
  typeId?: string // 待办类型ID
  statusId?: string // 待办状态ID
  priority?: 'none' | 'low' | 'medium' | 'high'
  parentId?: string // 父任务ID，用于支持父子任务
  noteId?: string // 绑定笔记ID
  order?: number // 拖拽排序顺序，值越小越靠前
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
  isCompleted?: boolean
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
  statusIsCompleted?: boolean  // 状态是否标记为完成状态
  typeName?: string
  typeColor?: string
  typeIcon?: string
}

// 笔记类信息
export interface NoteClassInfo {
  id: string
  name: string
  icon: string
  color: string
}

export interface TaskGroup {
  id: string
  title: string
  count: number
  completedCount: number
  tasks: TodoWithMeta[]
  classInfo?: NoteClassInfo // 笔记类信息（按笔记分组时可用）
}

export interface ViewFilters {
  status: string[]
  type: string[]
  search: string
}

// ==================== 评论相关类型 ====================

export interface TodoComment {
  id: string
  todoId: string // 关联的待办ID
  content: string // 评论内容
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
}