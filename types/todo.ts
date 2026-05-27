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
  parentId?: string
  typeId?: string // 待办类型ID
  statusId?: string // 待办状态ID
}

export interface TodoStatusFormData {
  name: string
  icon: string
  color: string
  description?: string
  isDefault?: boolean
}