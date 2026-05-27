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

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
  typeId?: string // 待办类型ID
}