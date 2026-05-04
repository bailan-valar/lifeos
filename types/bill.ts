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
 * 资金账户子类型（仅 type=personal 时使用）
 */
export type AccountSubtype = 'cash' | 'debit_card' | 'credit_card' | 'online_account'

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
  subtype?: AccountSubtype
  creditLimit?: number
  billingDay?: number
  repaymentDay?: number
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
  subtype?: AccountSubtype
  creditLimit?: number
  billingDay?: number
  repaymentDay?: number
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

/**
 * 预算周期
 */
export type BudgetPeriod = 'monthly' | 'yearly'

/**
 * 预算记录
 */
export interface BudgetEntry {
  id: string
  categoryId: string
  period: BudgetPeriod
  amount: number
  year: number
  month: number | null
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 预算表单数据
 */
export interface BudgetFormData {
  categoryId: string
  period: BudgetPeriod
  amount: number
  year: number
  month: number | null
}

/**
 * 信用卡账单周期状态
 */
export type StatementStatus = 'pending' | 'partial' | 'paid' | 'overdue'

/**
 * 信用卡账单周期
 */
export interface Statement {
  id: string
  accountId: string
  year: number
  month: number
  billingStartDate: string
  billingEndDate: string
  repaymentDate: string
  statementAmount: number
  minimumPayment: number
  paidAmount: number
  status: StatementStatus
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 信用卡账单周期表单数据
 */
export interface StatementFormData {
  statementAmount: number
  minimumPayment: number
  paidAmount: number
  status: StatementStatus
}
