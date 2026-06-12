/**
 * 报销单相关类型定义
 */

/** 报销单状态 */
export type ReimbursementStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'cancelled'

/** 报销单分组（元数据存储在 module_data 中） */
export interface ReimbursementGroup {
  id: string
  noteId: string
  title: string
  description?: string
  status: ReimbursementStatus
  createdAt: string
  updatedAt: string
}

/** 创建/编辑报销单的表单数据 */
export interface ReimbursementGroupFormData {
  title: string
  description?: string
}

/** 记录报销回款的表单数据 */
export interface ReimbursementIncomeFormData {
  amount: number
  accountId: string
  date: string
  description?: string
}

/** 报销单的运行时聚合视图（包含关联账单） */
export interface ReimbursementGroupView extends ReimbursementGroup {
  expenses: import('./bill').Bill[]
  income?: import('./bill').Bill
  totalExpense: number
  totalIncome: number
}
