/**
 * 账单类型
 */
export type BillType = 'income' | 'expense' | 'transfer' | 'debt'

/**
 * 债权债务子类型
 */
export type DebtSubtype = 'lend' | 'borrow'

/**
 * 账户类型
 */
export type AccountType = 'personal' | 'other'

/**
 * 账单状态
 */
export type BillStatus = 'pending' | 'completed' | 'cancelled'

/**
 * 分类类型
 */
export type CategoryType = 'income' | 'expense'

/**
 * 账户
 */
export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 账单分类
 */
export interface BillCategory {
  id: string
  name: string
  parentId: string
  type: CategoryType
  icon?: string
  color?: string
  order: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 账单记录
 */
export interface Bill {
  id: string
  noteId: string
  type: BillType
  amount: number
  currency: string
  fromAccountId: string
  toAccountId: string
  categoryId: string
  title: string
  description: string
  date: string
  status: BillStatus
  debtSubtype: DebtSubtype
  relatedPersonId: string
  settledAmount: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 账单表单数据（新建/编辑用）
 */
export interface BillFormData {
  type: BillType
  amount: number
  currency: string
  fromAccountId: string
  toAccountId: string
  categoryId: string
  title: string
  description: string
  date: string
  debtSubtype: DebtSubtype
  relatedPersonId: string
}

/**
 * 账户表单数据
 */
export interface AccountFormData {
  name: string
  type: AccountType
  currency: string
  icon: string
  color: string
}

/**
 * 分类表单数据
 */
export interface CategoryFormData {
  name: string
  type: CategoryType
  parentId: string
  icon: string
  color: string
}

/**
 * 树形分类节点
 */
export interface CategoryTreeNode extends BillCategory {
  children: CategoryTreeNode[]
  level: number
}
