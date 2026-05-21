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
 * 账单Tab ID
 */
export type TabId = 'bills' | 'accounts' | 'categories' | 'budgets' | 'rules'

/**
 * 视图模式
 */
export type ViewMode = 'card' | 'table' | 'calendar'

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
  // 父子账单关系
  parentId?: string              // 父账单ID（子账单有值）
  hasChildren?: boolean          // 是否有子账单（父账单标记）
  // 分摊与退款
  allocatedMonth?: string        // 分摊月份 YYYY-MM（统计时按此分组）
  isRefund?: boolean             // 是否为退款账单
  originalBillId?: string        // 退款源账单ID
  refundReason?: string          // 退款原因
  createdAt: string
  updatedAt: string
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
  // 父子账单关系
  parentId?: string
  hasChildren?: boolean
  // 分摊与退款
  allocatedMonth?: string
  isRefund?: boolean
  originalBillId?: string
  refundReason?: string
}

/**
 * 余额调整记录
 */
export interface BalanceAdjustment {
  id: string
  accountId: string
  date: string
  balanceBefore: number
  balanceAfter: number
  note?: string
  createdAt: string
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
 * 账户快捷创建 payload（AccountPicker 发出）
 */
export interface AccountCreatePayload {
  defaultName: string
  defaultType?: AccountType
  onCreated?: (account: Account) => void
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
export type ImportSource = 'alipay' | 'wechat' | 'cmb' | 'cmb_credit'

/**
 * 规则匹配模式
 */
export type ImportRuleMatchMode = 'exact' | 'regex' | 'fuzzy'

/**
 * 规则匹配字段
 */
export type ImportRuleMatchField = 'account' | 'description' | 'rawType'

/**
 * 规则匹配方向
 */
export type ImportRuleMatchDirection = 'in' | 'out'

/**
 * 导入规则
 * 按 CSV 中"交易对方""收/付款方式"或"商品说明"字段匹配,命中后填充 categoryId / accountId
 * accountId 为匹配到的账户,由 suggestAccountIds 自动推导 from/to
 * billType 可选,优先级高于按账户类型推断
 * matchField 指定匹配字段,未设置时默认为 'account'
 */
export interface ImportRule {
  id: string
  source: ImportSource | 'all'
  matchField?: ImportRuleMatchField
  matchDirection?: ImportRuleMatchDirection
  matchMode: ImportRuleMatchMode
  pattern: string
  categoryId: string
  accountId: string
  billType?: BillType
  priority: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 规则表单数据
 */
export interface ImportRuleFormData {
  source: ImportSource | 'all'
  matchField?: ImportRuleMatchField
  matchDirection?: ImportRuleMatchDirection
  matchMode: ImportRuleMatchMode
  pattern: string
  categoryId: string
  accountId: string
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
 * 与 ImportRecordItem 字段对齐，作为编辑态的统一数据结构
 */
export interface ImportPreviewRow extends CsvParsedRow {
  selected: boolean
  duplicate: boolean
  skipped: boolean
  skipReason?: string
  matchedRuleId: string | null
  paymentMethodRuleId: string | null
  descriptionRuleId?: string | null
  matchedAccountId: string | null
  myAccountId: string | null
  type: BillType
  debtSubtype: DebtSubtype
  categoryId: string
  fromAccountId: string
  toAccountId: string
  remark?: string
}

/**
 * 从 ImportPreviewRow 构建 ImportRecordItem（pending 状态）
 */
export function previewRowToRecordItem(row: ImportPreviewRow): ImportRecordItem {
  return {
    rawIndex: row.rawIndex,
    date: row.date,
    counterparty: row.counterparty,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    fingerprint: '',
    status: 'pending',
    selected: row.selected,
    duplicate: row.duplicate,
    skipped: row.skipped,
    skipReason: row.skipReason,
    type: row.type,
    debtSubtype: row.debtSubtype,
    categoryId: row.categoryId,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    matchedRuleId: row.matchedRuleId,
    paymentMethodRuleId: row.paymentMethodRuleId,
    descriptionRuleId: row.descriptionRuleId,
    matchedAccountId: row.matchedAccountId,
    myAccountId: row.myAccountId,
    paymentMethod: row.paymentMethod,
    rawType: row.rawType
  }
}

/**
 * 导入批次单行状态
 * - pending: 待导入（已解析但未执行导入）
 * - created: 成功创建账单
 * - skipped_duplicate: 重复跳过
 * - skipped_unselected: 未选中/已跳过
 * - failed: 导入失败
 */
export type ImportRecordItemStatus = 'pending' | 'created' | 'skipped_duplicate' | 'skipped_unselected' | 'failed'

/**
 * 导入批次状态
 * - pending: 待导入（已解析但未执行导入）
 * - success: 全部成功
 * - partial: 部分成功(有失败但有写入)
 * - failed: 全部失败/未写入
 * - rolled_back: 已被一键回滚
 */
export type ImportRecordStatus = 'pending' | 'success' | 'partial' | 'failed' | 'rolled_back'

/**
 * 导入批次中单行明细
 * 兼容 pending 编辑态与 post-import 完成态
 */
export interface ImportRecordItem {
  rawIndex: number
  date: string
  counterparty: string
  description?: string
  amount: number
  direction: 'in' | 'out'
  fingerprint: string
  status: ImportRecordItemStatus
  // --- pending 编辑态字段 ---
  selected?: boolean
  duplicate?: boolean
  skipped?: boolean
  skipReason?: string
  type?: BillType
  debtSubtype?: DebtSubtype
  categoryId?: string
  fromAccountId?: string
  toAccountId?: string
  matchedRuleId?: string | null
  paymentMethodRuleId?: string | null
  descriptionRuleId?: string | null
  rawTypeRuleId?: string | null
  matchedAccountId?: string | null
  myAccountId?: string | null
  paymentMethod?: string
  rawType?: string
  remark?: string
  // --- post-import 字段 ---
  billId?: string
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
  editingDurationMs?: number
  createdAt: string
  updatedAt: string
}

/**
 * 账单模块全局创建器（通过 provide/inject 提供，替代层层事件透传）
 */
export interface BillingCreators {
  openAccountCreator: (payload: AccountCreatePayload) => void
  openCategoryForm: (data: { type: CategoryType; defaultParentId?: string; defaultName?: string; onCreated?: (category: BillCategory) => void }) => void
  openRuleDialog: (form: ImportRuleFormData, options?: { onSaved?: () => void }) => void
}

/**
 * 账单拆分项（用于多分类拆分）
 */
export interface BillSplitItem {
  categoryId: string
  amount: number
  description?: string
}

/**
 * 账单分摊项（用于跨期分摊）
 */
export interface BillAllocateItem {
  month: string      // YYYY-MM 格式
  amount: number
  description?: string
  date?: string      // YYYY-MM-DD 格式，自定义日期
}

/**
 * 退款表单数据
 */
export interface RefundFormData {
  billId: string
  amount: number
  reason: string
  date: string
  accountId: string
}

/**
 * 分期还款项
 */
export interface InstallmentItem {
  month: string      // YYYY-MM 格式
  amount: number     // 本期还款金额（含手续费）
  principal: number  // 本期本金
  fee: number        // 本期手续费
  date: string       // YYYY-MM-DD 格式，还款日期
  description?: string
}

/**
 * 分期还款表单数据
 */
export interface InstallmentFormData {
  accountId: string       // 信用卡账户ID
  fromAccountId: string   // 还款账户ID（储蓄卡/现金等）
  totalAmount: number     // 分期总金额
  periods: number         // 分期期数
  totalFee: number        // 总手续费
  firstDate: string       // 首期还款日 YYYY-MM-DD
  noteId: string
  categoryId?: string     // 手续费分类（可选）
}
