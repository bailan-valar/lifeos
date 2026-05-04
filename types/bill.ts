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
 * - personal: 自己持有的资金账户(现金/储蓄卡/信用卡/网络账户)
 * - merchant: 商户(超市/餐厅/电商等),CSV 导入对方多归此类
 * - contact: 联系人(借贷对方,亲友/同事)
 * - other: 兼容旧数据;新版 UI 默认不再创建此类
 */
export type AccountType = 'personal' | 'merchant' | 'contact' | 'other'

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
  aliases?: string[]
  categoryId?: string
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
  description: string
  date: string
  status: BillStatus
  debtSubtype: DebtSubtype
  relatedPersonId: string
  settledAmount: number
  importBatchId?: string
  importSource?: ImportSource
  importFingerprint?: string
  counterpartyRaw?: string
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 账单表单数据（新建/编辑用）
 */
export interface BillFormData {
  noteId: string
  type: BillType
  amount: number
  currency: string
  fromAccountId: string
  toAccountId: string
  categoryId: string
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
  aliases?: string[]
  categoryId?: string
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
 * 预算周期类型（时序模型）
 */
export type BudgetCycleType = 'monthly' | 'yearly'

/**
 * 预算记录（时序生效模型）
 */
export interface BudgetEntry {
  id: string
  noteId: string
  categoryId: string
  effectiveFromYear: number
  effectiveFromMonth: number
  cycleType: BudgetCycleType
  amount: number
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 预算表单数据
 */
export interface BudgetFormData {
  noteId: string
  categoryId: string
  effectiveFromYear: number
  effectiveFromMonth: number
  cycleType: BudgetCycleType
  amount: number
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

/**
 * 导入来源
 */
export type ImportSource = 'alipay' | 'wechat'

/**
 * 规则匹配模式
 */
export type ImportRuleMatchMode = 'exact' | 'regex' | 'fuzzy'

/**
 * 导入规则
 * 按 CSV 中"交易对方"字段匹配,命中后填充 categoryId / accountId
 * accountId 为匹配的对方账户,由 suggestAccountIds 自动推导 from/to
 * billType 可选,优先级高于按账户类型推断
 */
export interface ImportRule {
  id: string
  name: string
  source: ImportSource | 'all'
  matchMode: ImportRuleMatchMode
  pattern: string
  categoryId: string
  accountId: string
  myAccountId?: string
  billType?: BillType
  priority: number
  enabled: boolean
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

/**
 * 规则表单数据
 */
export interface ImportRuleFormData {
  name: string
  source: ImportSource | 'all'
  matchMode: ImportRuleMatchMode
  pattern: string
  categoryId: string
  accountId: string
  myAccountId?: string
  billType?: BillType
  priority: number
  enabled: boolean
}

/**
 * CSV 原始解析结果(各列已映射到统一字段)
 */
export interface CsvParsedRow {
  rawIndex: number
  date: string
  counterparty: string
  description: string
  amount: number
  direction: 'in' | 'out'
  rawType: string
  paymentMethod?: string
  rawPaymentDirection?: string
  transactionStatus?: string
}

/**
 * 导入预览行(已应用规则,允许用户修改)
 */
export interface ImportPreviewRow extends CsvParsedRow {
  selected: boolean
  duplicate: boolean
  skipped: boolean
  skipReason?: string
  matchedRuleId: string | null
  matchedAccountId: string | null
  myAccountId: string | null
  type: BillType
  debtSubtype: DebtSubtype
  categoryId: string
  fromAccountId: string
  toAccountId: string
}

/**
 * 导入批次状态
 * - success: 全部成功
 * - partial: 部分成功(有失败但有写入)
 * - failed: 全部失败/未写入
 * - rolled_back: 已被一键回滚
 */
export type ImportRecordStatus = 'success' | 'partial' | 'failed' | 'rolled_back'

/**
 * 导入批次中单行明细
 */
export interface ImportRecordItem {
  rawIndex: number
  date: string
  counterparty: string
  amount: number
  direction: 'in' | 'out'
  fingerprint: string
  status: 'created' | 'skipped_duplicate' | 'skipped_unselected' | 'failed'
  billId?: string
  matchedRuleId?: string | null
  errorMessage?: string
}

/**
 * 导入批次记录
 */
export interface ImportRecord {
  id: string
  noteId: string
  source: ImportSource
  fileName: string
  fileSize: number
  totalParsed: number
  selectedCount: number
  successCount: number
  skippedCount: number
  failedCount: number
  status: ImportRecordStatus
  billIds: string[]
  items: ImportRecordItem[]
  startedAt: string
  finishedAt: string
  createdAt: string
  updatedAt: string
  isSynced: boolean
}
