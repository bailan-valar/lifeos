# 报销功能流程闭环优化方案

> 生成日期：2026-06-12
> 模块：LifeOS 记账模块
> 文档类型：产品方案（v2 - 修正版：报销 ≠ 退款）

---

## 一、场景定义

### 1.1 什么是「报销」（区别于「退款」）

| 维度 | 退款（Refund） | 报销（Reimbursement） |
|------|---------------|---------------------|
| **场景** | 买的东西退了，商家退钱 | 替公司/他人垫付，对方后付款给我 |
| **示例** | 网购退货 → 商家退款 | 出差打车 ¥30 → 公司报销 ¥30 |
| **关系** | 一笔支出 ↔ 一笔回款（1:1） | **多笔支出** ↔ **一笔报销回款（N:1）** |
| **现有支持** | ✅ 已实现（`isRefund`/`originalBillId`） | ❌ 未实现 |

### 1.2 典型用户故事

> **场景一：日常报销**
> "团建聚餐我垫付了 ¥500，打车 ¥80，共 ¥580。月底公司统一报销了 ¥580。"
>
> **场景二：差旅报销**
> "出差北京：机票 ¥1,200、酒店 ¥800、打车 ¥150。回来后提交报销单，一周后公司打款 ¥2,150。"
>
> **场景三：部分报销**
> "团建花了 ¥500，但公司只能报 ¥300，剩下 ¥200 自己承担。"

### 1.3 核心流程

```
垫付支出 → 标记"待报销" → (可选)创建报销单 → 公司打款 → 记录报销收入 → 闭环
  ¥30打车      标记状态          关联多笔支出      ¥30到账      关联报销单     完成
  ¥500团建     标记状态                          ¥580到账
```

**关键需求：多笔支出 → 一笔报销（N:1）**

---

## 二、现有能力分析

### 2.1 现有退款机制（保留不动）

| 能力 | 字段/方法 | 状态 |
|------|----------|------|
| 创建退款账单 | `isRefund`, `originalBillId`, `createRefundBill()` | ✅ 保持 |
| 关联已有账单为退款 | `linkRefundBill()` | ✅ 保持 |
| 退款badge显示 | `BillListItem` 退款标记 | ✅ 保持 |

> **重要**：报销是全新概念，不复用 `isRefund`/`originalBillId` 字段。退款功能保持不变。

### 2.2 报销相关缺失

| 缺失能力 | 说明 |
|---------|------|
| 标记支出为"待报销" | Bill 上无报销状态字段 |
| 报销单概念 | 无报销单实体，无法 N:1 关联 |
| 报销收入关联 | 无法将一笔收入标记为"报销回款"并关联多笔支出 |
| 报销统计 | 无法查看"待报销总额"、"已报销总额" |
| 报销进度追踪 | 无法知道哪些已报、哪些未报 |

---

## 三、方案概览

### 方案对比矩阵

| 维度 | 方案A：轻量标记 | 方案B：报销单（推荐） | 方案C：完整审批流 | 方案D：智能报销 |
|------|---------------|---------------------|------------------|----------------|
| **核心思路** | 给支出加"待报销"标签 | 新增报销单实体，N:1 关联 | 报销单 + 审批流程 | 方案B + AI匹配 |
| **N:1 支持** | ❌ 不支持 | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| **改动范围** | 小 | 中 | 大 | 大 |
| **新增页面** | 0 | 1（报销仪表盘） | 2（列表+详情） | 2 |
| **新增组件** | 3 | 6 | 9 | 11 |
| **数据模型变更** | Bill 加字段 | Bill 加字段 + 新增报销分组 | 新增集合 | 新增集合 |
| **开发周期** | 1-2天 | 3-5天 | 7-10天 | 10-14天 |
| **适用场景** | 偶尔报销 | 规律报销 | 团队报销 | 高频报销 |
| **推荐度** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 四、方案A：轻量标记

### 4.1 设计理念

**不引入报销单实体，仅在 Bill 上加报销状态字段。** 最小改动，适合偶尔需要追踪报销的用户。每笔支出独立标记，不支持多笔合并报销。

### 4.2 数据模型变更

```typescript
// types/bill.ts - Bill 接口新增字段
interface Bill {
  // ... 现有字段（isRefund/originalBillId 保持不变）

  // 报销相关（新增）
  reimburseStatus?: 'none' | 'pending' | 'partial' | 'reimbursed'
  // none: 默认，非报销类支出
  // pending: 待报销（已标记）
  // partial: 部分报销
  // reimbursed: 已报销

  reimburseNote?: string       // 报销备注（如"公司报销"、"保险理赔"）
  reimbursedAmount?: number    // 已报销金额（用于部分报销场景）
  reimbursedDate?: string      // 报销到账日期
}
```

### 4.3 操作流程

```
┌──────────────────────────────────────────────────────┐
│                 方案A 操作流程                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ① 记录支出（正常创建支出账单）                          │
│                                                      │
│  ② 右键菜单 → "标记待报销"                              │
│     └→ 可选填：报销备注（公司/保险/其他）                 │
│     └→ 账单列表显示 [待报销] badge                      │
│                                                      │
│ ③ 公司打款后，右键菜单 → "标记已报销"                    │
│     ├→ 填写：报销到账金额、到账日期                      │
│     ├→ 金额 = 原金额 → reimburseStatus = 'reimbursed'  │
│     └→ 金额 < 原金额 → reimburseStatus = 'partial'     │
│                                                      │
│  ④ 账单列表筛选"待报销"查看汇总                          │
│     └→ 统计栏显示：待报销总额 / 已报销总额               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4.4 关联修改的界面

| 界面 | 修改内容 | 类型 |
|------|---------|------|
| `types/bill.ts` | Bill 新增报销字段 | 修改 |
| `BillContextMenu.vue` | 新增"标记待报销"/"标记已报销"/"取消报销标记" | 修改 |
| `BillListItem.vue` | 新增报销状态 badge（待报销/部分报销/已报销） | 修改 |
| `BillsTabPanel.vue` | 新增报销筛选按钮；统计栏新增报销统计 | 修改 |
| `BillDialog.vue` | 编辑时可设置报销状态 | 修改 |

### 4.5 局限性

- **不支持 N:1**：每笔支出独立追踪，无法合并为一笔报销
- **无法关联报销收入**：公司打款时只能手动标记，无法自动关联
- **无全局视图**：没有专门的报销汇总页面

---

## 五、方案B：报销单（推荐）

### 5.1 设计理念

**引入轻量级报销单概念，支持多笔支出合并为一笔报销。** 报销单不是独立集合，而是通过 `reimbursementId` 字段将多笔支出和一笔收入关联起来，保持数据模型的简洁。

### 5.2 数据模型变更

```typescript
// types/bill.ts - Bill 接口新增字段
interface Bill {
  // ... 现有字段

  // 报销关联（新增）
  reimbursementId?: string     // 所属报销单ID
  reimbursementRole?: 'expense' | 'income'
  // expense: 此账单是报销单中的支出项（垫付）
  // income: 此账单是报销单的回款项（公司打款）
}

// types/reimbursement.ts - 新增报销单类型（虚拟实体，不独立存储）
// 报销单是通过 reimbursementId 关联的一组账单的虚拟聚合
interface ReimbursementGroup {
  id: string                   // 报销单ID（即 reimbursementId）
  noteId: string               // 关联笔记

  // 元信息（存储在第一笔关联账单的扩展字段中，或单独的 module_data 记录）
  title: string                // 报销单标题（如"6月差旅报销"）
  description?: string         // 备注
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'cancelled'
  createdAt: string
  updatedAt: string

  // 关联数据（运行时从 bills 中聚合）
  expenses: Bill[]             // 垫付支出列表
  income?: Bill                // 报销回款（收入账单）
  totalExpense: number         // 垫付总额
  totalIncome: number          // 回款总额
}
```

### 5.3 存储方案

**方案B-1：纯字段方案（推荐，最小改动）**
- 不新增集合，在 Bill 上加 `reimbursementId` 和 `reimbursementRole` 字段
- 报销单元数据存储在 `module_data` 集合（key: `reimbursement/{id}`）
- 运行时通过 `reimbursementId` 聚合相关账单

**方案B-2：独立集合方案**
- 新增 `reimbursements` 集合
- 更完整但改动更大，适合后续升级到方案C

### 5.4 操作流程

```
┌─────────────────────────────────────────────────────────────┐
│                 方案B 操作流程                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① 记录支出（正常创建支出账单，如出差打车 ¥30）                │
│                                                             │
│  ② 创建报销单                                                │
│     ├→ 方式一：单笔支出右键 → "加入报销单" → 选择已有报销单    │
│     │               或 "新建报销单"                           │
│     ├→ 方式二：批量选择多笔支出 → "创建报销单"                 │
│     │   （勾选打车¥30 + 机票¥1200 → 合并为一个报销单）         │
│     └→ 填写报销单标题、备注                                   │
│                                                             │
│  ③ 查看报销仪表盘                                            │
│     ├→ 报销单列表（按状态分组）                                │
│     ├→ 待处理：显示待提交/审批中的报销单                       │
│     └→ 已完成：显示已打款的报销单                              │
│                                                             │
│  ④ 公司打款（报销回款）                                       │
│     ├→ 在报销单详情页点击"记录回款"                            │
│     ├→ 填写：回款金额、到账账户、日期                          │
│     ├→ 系统自动创建一笔收入账单                                │
│     │   （type=income, reimbursementRole='income',           │
│     │    reimbursementId=报销单ID）                           │
│     └→ 支出账单的状态同步更新                                  │
│                                                             │
│  ⑤ 闭环完成                                                  │
│     ├→ 支出账单显示"已报销 ¥1230" badge                       │
│     ├→ 收入账单显示"报销回款" badge                            │
│     └→ 报销单状态 → paid                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 报销单生命周期

```
 draft（草稿）
    │
    ▼  点击"提交"
 submitted（已提交）
    │
    ▼  审批通过（可跳过）
 approved（已批准）
    │
    ▼  记录回款
 paid（已打款）✅ 闭环完成
    │
    ▼  如需撤回
 cancelled（已取消）
```

> 注：个人记账场景下，审批步骤可以跳过，直接 draft → paid。

### 5.6 关联修改的界面

| 界面 | 修改内容 | 类型 |
|------|---------|------|
| **新增** `ReimburseDashboard.vue` | 报销仪表盘页面 | 新页面 |
| **新增** `ReimburseGroupDialog.vue` | 创建/编辑报销单对话框 | 新组件 |
| **新增** `ReimburseIncomeDialog.vue` | 记录报销回款对话框 | 新组件 |
| **新增** `ReimburseStatusBadge.vue` | 报销状态徽章组件 | 新组件 |
| **新增** `ReimburseSummaryCard.vue` | 报销汇总统计卡片 | 新组件 |
| **新增** `ReimburseGroupItem.vue` | 报销单列表项组件 | 新组件 |
| `types/bill.ts` | Bill 新增 reimbursementId/reimbursementRole 字段 | 修改 |
| `types/reimbursement.ts` | 新增 ReimbursementGroup 类型 | 新文件 |
| `BillContextMenu.vue` | 新增"加入报销单"/"从报销单移除" | 修改 |
| `BillListItem.vue` | 新增报销状态 badge | 修改 |
| `BillList.vue` | 报销状态筛选；批量操作支持创建报销单 | 修改 |
| `BillsTabPanel.vue` | 新增报销筛选入口；统计栏新增报销统计 | 修改 |
| `BillingSidebar.vue` | 新增"报销"Tab 入口 | 修改 |
| `BillingMobileTabbar.vue` | 移动端报销入口 | 修改 |
| `BillDialog.vue` | 编辑时显示报销关联信息 | 修改 |
| `stores/billing.ts` | 新增报销相关导航状态 | 修改 |
| `composables/useBills.ts` | 新增按报销ID查询、创建回款账单方法 | 修改 |
| **新增** `composables/useReimburse.ts` | 报销单 CRUD 和聚合查询 | 新文件 |

### 5.7 报销仪表盘布局

```
┌─────────────────────────────────────────────────────────────┐
│  ← 报销管理                                        [+新建]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  ¥3,200  │  │  ¥1,800  │  │  ¥1,400  │  │    2     │   │
│  │  垫付总额  │  │  已报销   │  │  待报销   │  │  报销单   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ── 待处理 ───────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📋 6月差旅报销         ¥2,150    草稿      3笔支出     │  │
│  │    ✈️机票 ¥1,200 | 🏨酒店 ¥800 | 🚕打车 ¥150         │  │
│  │                              [记录回款] [编辑] [删除]  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📋 团建费用            ¥580     已提交    2笔支出      │  │
│  │    🍽️聚餐 ¥500 | 🚕打车 ¥80                         │  │
│  │                              [记录回款] [编辑] [删除]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ── 已完成 ───────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✅ 5月办公采购          ¥300     已打款    06/08       │  │
│  │    回款 ¥300 → 微信钱包                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.8 报销单详情页（报销仪表盘内展开）

```
┌─────────────────────────────────────────────────────────────┐
│  ← 6月差旅报销                                    [编辑]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  状态：● 已批准          创建时间：2026-06-10                │
│                                                             │
│  ── 进度 ─────────────────────────────────────────────────  │
│  [●草稿] ── [●提交] ── [●批准] ── [○打款]                   │
│                                                             │
│  ── 垫付支出（3笔）───────────────────────────────────────  │
│  │ ✈️ 机票        ¥1,200   06/05    交通出行               │
│  │ 🏨 酒店         ¥800    06/05-07 住宿                   │
│  │ 🚕 打车         ¥150    06/05    交通出行               │
│  │            ──────────                                    │
│  │ 合计          ¥2,150                                     │
│                                                             │
│  ── 报销回款 ─────────────────────────────────────────────  │
│  │ 尚未记录回款                          [+ 记录回款]       │
│                                                             │
│  ── 备注 ─────────────────────────────────────────────────  │
│  │ 北京出差3天差旅费用，发票已提交财务                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.9 部分报销处理

```
场景：团建花了 ¥500，公司只报 ¥300

方案B 处理：
1. 创建报销单，关联支出 ¥500
2. 记录回款 ¥300（部分报销）
3. 系统自动创建收入账单 ¥300（reimbursementRole='income'）
4. 报销单显示：垫付 ¥500 / 已报 ¥300 / 自付 ¥200
5. 支出账单 badge 显示：[已报销 ¥300/¥500]
```

---

## 六、方案C：完整审批流

### 6.1 设计理念

**在方案B基础上增加完整审批流程。** 适合小团队场景，需要审批人角色。

### 6.2 额外数据模型

```typescript
// 在方案B基础上扩展
interface ReimbursementGroup {
  // ... 方案B的字段

  // 审批流（新增）
  submittedAt?: string         // 提交时间
  approvedAt?: string          // 审批时间
  approvedBy?: string          // 审批人（账户ID）
  approverName?: string        // 审批人名称
  rejectReason?: string        // 驳回原因
  paidAt?: string              // 打款时间

  // 附件（新增）
  attachments?: Array<{
    name: string
    url: string
    type: string                // image/pdf/other
    uploadedAt: string
  }>
}

// 审批记录（存储在 module_data）
interface ApprovalRecord {
  id: string
  reimbursementId: string
  action: 'submit' | 'approve' | 'reject' | 'pay' | 'cancel'
  operatorId: string
  operatorName: string
  note?: string
  createdAt: string
}
```

### 6.3 操作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                 方案C 操作流程                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ① 记录支出 → ② 创建报销单 → ③ 上传附件 → ④ 提交审批            │
│                                                                 │
│  ①-③ 与方案B一致，额外支持：                                     │
│     ├→ 上传发票照片（拍照或选择图片）                              │
│     └→ 填写报销类型（差旅/餐饮/采购/其他）                        │
│                                                                 │
│  ④ 提交审批                                                     │
│     ├→ 选择审批人（从账户列表中选择）                              │
│     └→ 状态变为 submitted                                       │
│                                                                 │
│  ⑤ 审批处理                                                     │
│     ├→ 通过 → 状态变为 approved → 等待打款                       │
│     └→ 驳回 → 填写驳回原因 → 修改后可重新提交                    │
│                                                                 │
│  ⑥ 记录打款（与方案B一致）                                       │
│     └→ 状态变为 paid ✅                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 额外关联修改

在方案B基础上额外增加：

| 界面 | 修改内容 | 类型 |
|------|---------|------|
| **新增** `ReimburseApprovalDialog.vue` | 审批操作弹窗 | 新组件 |
| **新增** `ReimburseTimeline.vue` | 审批进度时间线 | 新组件 |
| **新增** `AttachmentUpload.vue` | 附件上传组件 | 新组件 |
| `ReimburseGroupDialog.vue` | 增加审批人选择、附件上传 | 修改 |
| `ReimburseDashboard.vue` | 增加审批队列视图 | 修改 |

### 6.5 局限性

- **单用户系统**：LifeOS 当前是单用户，审批人角色需要模拟（可记录但无真正多人协作）
- **附件存储**：PouchDB 不适合存大文件，图片需要 base64 或外部存储
- **过度设计风险**：对个人用户来说功能过重

---

## 七、方案D：智能报销

### 7.1 设计理念

**在方案B基础上增加智能匹配和自动化。** 当用户创建收入账单时，系统自动推荐关联的待报销支出。

### 7.2 核心特性

| 特性 | 说明 |
|------|------|
| 智能匹配 | 创建收入账单时，自动推荐金额相近的待报销支出 |
| 批量归集 | 支持按日期范围/分类批量创建报销单 |
| 逾期提醒 | 超过预期报销日期未收到打款时提醒 |
| 报销来源分析 | 按报销来源（公司、保险、其他）统计 |
| 导入识别 | CSV导入时自动识别报销性质的交易 |

### 7.3 智能匹配流程

```
用户创建收入账单 "公司报销款 ¥580"
         │
         ▼
  系统自动扫描同笔记下状态为 pending 的待报销支出
         │
         ├→ 找到未归集的支出：打车 ¥80 + 聚餐 ¥500
         │   → 总额 ¥580 = 收入 ¥580 ✅ 完美匹配
         │   → 弹出建议："将此收入关联为「打车+聚餐」的报销回款？"
         │
         ├→ 找到近似匹配：机票 ¥1200 (单笔超出)
         │   → 不推荐
         │
         └→ 用户确认 → 自动创建报销单并关联
```

### 7.4 局限性

- **匹配精度有限**：纯金额组合匹配，可能有多解
- **开发周期长**：智能算法需要迭代
- **性能考量**：每次保存收入都需扫描

---

## 八、推荐实施路径

### 8.1 分阶段实施

```
Phase 1（3-5天）: 方案B - 报销单
├── Bill 新增 reimbursementId / reimbursementRole 字段
├── 新增报销单 CRUD（composable + module_data 存储）
├── 右键菜单新增报销操作
├── 账单列表报销筛选和 badge
├── 报销仪表盘页面
└── 记录回款（自动创建收入账单）

Phase 2（可选，1-2天）: 方案C - 审批增强
├── 审批状态流转
├── 审批记录时间线
└── 附件上传（如需要）

Phase 3（可选，3-5天）: 方案D - 智能增强
├── 智能匹配算法
├── 批量归集
└── 来源分析
```

### 8.2 方案选择建议

| 用户画像 | 推荐方案 |
|---------|---------|
| 个人记账，偶尔报销 | 方案A（轻量标记） |
| 个人记账，规律报销 | **方案B（报销单）** ⭐ 推荐 |
| 小团队，需要审批 | 方案C（审批流） |
| 高频报销，追求效率 | 方案D（智能） |

**推荐方案B**：支持多笔支出合并报销的核心需求，改动适中，且为后续升级留有空间。

---

## 九、与现有退款功能的关系

### 9.1 共存策略

```
退款（Refund）和报销（Reimbursement）是两个独立概念，共存不冲突：

退款：商户退钱 → 一对一 → isRefund/originalBillId
报销：公司垫付 → 多对一 → reimbursementId/reimbursementRole

同一笔账单可以同时涉及：
- 不可以：既是退款又是报销（互斥）
- 可以：既已退款又已报销（但实际意义不大）
```

### 9.2 右键菜单共存

```
BillContextMenu 完整菜单项（扩展后）：
├── 复制账单
├── 编辑
├── 拆分账单
├── 分摊到月份
├── ── 分隔线 ──
├── 退款（现有）
├── 关联退款（现有）
├── 关联为退款（现有）
├── ── 分隔线 ──
├── 加入报销单（新增）     ← 仅 type=expense 时显示
├── 从报销单移除（新增）   ← 仅已在报销单中时显示
├── 记录报销回款（新增）   ← 仅报销单详情页
├── ── 分隔线 ──
└── 删除
```

---

## 十、详细功能点分解（方案B）

> 以下按每个页面/组件拆分具体的新增或调整功能点，明确用户可感知的行为变化。

### 10.1 新增文件 — 功能点明细

#### `types/reimbursement.ts`（新文件）

| 功能点 | 说明 |
|--------|------|
| `ReimbursementGroup` 接口 | 报销单虚拟实体：id、title、description、status、noteId、createdAt、updatedAt |
| `ReimbursementStatus` 类型 | `'draft' \| 'submitted' \| 'approved' \| 'paid' \| 'cancelled'` |
| 运行时聚合字段 | expenses、income、totalExpense、totalIncome（由 composable 查询时填充） |

#### `types/bill.ts`（修改）

| 功能点 | 说明 |
|--------|------|
| 新增 `reimbursementId?: string` | 关联的报销单ID，为空表示未归入任何报销单 |
| 新增 `reimbursementRole?: 'expense' \| 'income'` | 此账单在报销单中的角色：expense=垫付支出，income=回款收入 |

#### `composables/useReimburse.ts`（新文件）

| 功能点 | 说明 |
|--------|------|
| `loadReimbursements(noteId?)` | 查询所有报销单（从 module_data），聚合关联账单 |
| `createReimbursement(data)` | 创建报销单元数据（存 module_data `reimbursement/{id}`） |
| `updateReimbursement(id, patch)` | 更新报销单标题/备注/状态 |
| `deleteReimbursement(id)` | 删除报销单，同时清除关联账单的 reimbursementId |
| `addBillToReimbursement(billId, reimbursementId)` | 将一笔支出加入报销单（patch bill） |
| `removeBillFromReimbursement(billId)` | 将一笔支出从报销单移除 |
| `recordReimbursementIncome(reimbursementId, data)` | 记录报销回款：创建收入账单 + 更新报销单状态为 paid |
| `getBillsByReimbursement(reimbursementId)` | 查询报销单关联的所有账单（支出+收入） |
| `getUnreimbursedExpenses(noteId?)` | 查询所有未归入报销单的支出账单 |
| `getReimburseStats(noteId?)` | 统计：垫付总额、已报销、待报销、报销单数量 |

#### `composables/useBills.ts`（修改）

| 功能点 | 说明 |
|--------|------|
| `loadBillsByReimbursement(reimbursementId)` | 新增：按 reimbursementId 查询关联账单 |
| `createReimbursementIncome(data)` | 新增：创建报销回款收入账单（type=income，设置 reimbursementRole='income'） |

#### `ReimburseDashboard.vue`（新页面 — 报销仪表盘）

| 功能点 | 说明 |
|--------|------|
| 统计卡片区域 | 显示：垫付总额、已报销、待报销、报销单数量 |
| 待处理列表 | 按 status=draft/submitted/approved 过滤，按创建时间倒序 |
| 已完成列表 | 按 status=paid 过滤，按打款时间倒序 |
| 新建报销单按钮 | 打开 ReimburseGroupDialog |
| 报销单卡片点击 | 展开详情（关联支出列表 + 记录回款入口） |
| 记录回款按钮 | 打开 ReimburseIncomeDialog |
| 编辑/删除操作 | 编辑报销单信息 / 删除报销单（确认后执行） |
| 状态流转按钮 | 草稿→提交→批准→打款（简化流转，审批可跳过） |
| 空状态提示 | "还没有报销单，从账单列表右键创建" |

#### `ReimburseGroupDialog.vue`（新组件 — 创建/编辑报销单）

| 功能点 | 说明 |
|--------|------|
| 标题输入 | 报销单名称（如"6月差旅报销"） |
| 备注输入 | 可选的补充说明 |
| 关联支出选择 | 使用 BillPicker 选择要纳入的支出账单（已选中的预填） |
| 已关联支出列表 | 显示已选中的支出账单，支持移除 |
| 自动计算总额 | 实时显示选中支出的金额合计 |
| 创建/保存按钮 | 创建新报销单或更新已有报销单 |

#### `ReimburseIncomeDialog.vue`（新组件 — 记录报销回款）

| 功能点 | 说明 |
|--------|------|
| 报销单信息 | 只读显示报销单标题和垫付总额 |
| 回款金额输入 | 默认=垫付总额，支持部分报销 |
| 到账账户选择 | 使用 AccountPicker，选择回款到哪个账户 |
| 到账日期选择 | 默认今天 |
| 回款备注 | 可选 |
| 确认后自动创建收入账单 | type=income, reimbursementRole='income', reimbursementId=报销单ID |
| 确认后更新报销单状态 | status → paid（或 partial 如果金额 < 总额） |

#### `ReimburseStatusBadge.vue`（新组件 — 报销状态徽章）

| 功能点 | 说明 |
|--------|------|
| 待报销（pending） | 橙色标签 "待报销" |
| 已报销（reimbursed） | 绿色标签 "已报销 ¥300" |
| 部分报销（partial） | 蓝色标签 "部分报销 ¥300/¥500" |
| 报销回款（income role） | 紫色标签 "报销回款" |

#### `ReimburseSummaryCard.vue`（新组件 — 报销汇总卡片）

| 功能点 | 说明 |
|--------|------|
| 垫付总额 | 关联报销的所有支出之和 |
| 已报销 | 已打款的报销金额 |
| 待报销 | 尚未打款的报销金额 |
| 报销单数 | 报销单总数 |

#### `ReimburseGroupItem.vue`（新组件 — 报销单列表项）

| 功能点 | 说明 |
|--------|------|
| 报销单标题 + 状态标签 | 草稿(灰)/已提交(蓝)/已批准(紫)/已打款(绿) |
| 垫付总额 | 关联支出金额之和 |
| 关联支出摘要 | 前 2-3 笔支出的描述 + 金额 |
| 操作按钮 | 记录回款 / 编辑 / 删除 |

---

### 10.2 修改文件 — 功能点明细

#### `BillContextMenu.vue`

| 功能点 | 操作 | 说明 |
|--------|------|------|
| 新增"加入报销单"菜单项 | 右键 → 加入报销单 | 条件：`type==='expense' && !reimbursementId && !isRefund`；弹出报销单选择器（已有报销单列表 + 新建选项） |
| 新增"从报销单移除"菜单项 | 右键 → 从报销单移除 | 条件：`reimbursementId && reimbursementRole==='expense'`；确认后移除，patch bill 清空 reimbursementId |
| 新增分隔线 | — | 在退款菜单项和报销菜单项之间加分隔线 |

#### `BillListItem.vue`

| 功能点 | 说明 |
|--------|------|
| 报销状态徽章渲染 | 引入 ReimburseStatusBadge 组件，根据 reimbursementId/reimbursementRole 显示对应标签 |
| 报销信息展示 | 已在报销单中的支出：显示报销单标题（如"6月差旅报销"）；报销回款收入：显示"报销回款"标签 |

#### `BillList.vue`

| 功能点 | 说明 |
|--------|------|
| 报销状态筛选 | 新增筛选按钮：全部 / 待报销 / 已报销 / 报销回款；过滤 displayBills |
| 批量创建报销单 | 批量选择模式下，底部工具栏新增"创建报销单"按钮，将选中的多笔支出合入一个报销单 |

#### `BillsTabPanel.vue`

| 功能点 | 说明 |
|--------|------|
| 报销筛选入口 | 在筛选栏区域新增报销状态筛选按钮（与搜索、日期筛选并列） |
| 统计栏报销统计 | BillStatsBar 新增一行：待报销 ¥XX / 已报销 ¥XX |
| 报销单相关对话框状态 | 新增 showReimburseGroupDialog / showReimburseIncomeDialog 等响应式状态 |
| 事件处理 | 新增 handleAddToReimbursement / handleRemoveFromReimbursement / handleRecordIncome 事件处理函数 |

#### `BillDialog.vue`（账单编辑弹窗）

| 功能点 | 说明 |
|--------|------|
| 报销关联信息展示 | 编辑模式：如果账单有 reimbursementId，显示"所属报销单：{标题}"，可点击跳转 |
| 报销状态只读展示 | 不在弹窗中修改报销关联（通过右键菜单操作更直观） |

#### `BillingView.vue`

| 功能点 | 说明 |
|--------|------|
| 新增报销Tab路由 | 支持 `?tab=reimburse` 参数路由到报销仪表盘 |
| ReimburseDashboard 组件挂载 | 在 Tab 面板区域条件渲染 ReimburseDashboard |

#### `BillingSidebar.vue`（桌面端侧边栏）

| 功能点 | 说明 |
|--------|------|
| 新增"报销"导航项 | 图标使用 `SOLAR_ICONS.billing.receipt` 或类似，点击跳转 `?tab=reimburse` |
| 导航项位置 | 放在"账单"和"账户"之间，或"预算"之后 |

#### `BillingMobileTabbar.vue`（移动端底部栏）

| 功能点 | 说明 |
|--------|------|
| 新增"报销"Tab | 底部导航栏增加报销入口（如空间不够可替换不常用的Tab） |

#### `stores/billing.ts`

| 功能点 | 说明 |
|--------|------|
| TabId 类型扩展 | 新增 `'reimburse'` 到 TabId 联合类型 |
| 报销相关状态（可选） | 如 `reimburseStatusFilter` 筛选状态（也可放在组件本地） |

---

## 十一、用户闭环操作手册（方案B）

### 11.1 完整闭环流程（用户视角）

```
┌─────────────────────────────────────────────────────────────────┐
│                        报销闭环操作流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 记录垫付支出                                            │
│  ─────────────────                                              │
│  入口：记账页面 → + 新建账单                                     │
│  操作：                                                          │
│    ① 选择类型"支出"                                              │
│    ② 填写金额、分类、账户、描述                                   │
│    ③ 保存 → 账单出现在列表中                                     │
│  状态：正常支出账单，无特殊标记                                    │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│  Step 2: 创建报销单（关联多笔支出）                               │
│  ────────────────────────────────                                │
│  入口 A（单笔）：支出账单右键 → "加入报销单"                      │
│  入口 B（批量）：勾选多笔支出 → 底部"创建报销单"按钮              │
│  操作：                                                          │
│    ① 弹出报销单对话框                                            │
│    ② 填写报销单标题（如"6月差旅报销"）                            │
│    ③ 确认关联的支出列表（可增减）                                 │
│    ④ 保存 → 报销单创建成功                                       │
│  状态：报销单 = draft（草稿）                                    │
│        支出账单显示 [待报销] badge                                │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│  Step 3: 追踪报销进度                                            │
│  ──────────────────                                              │
│  入口：侧边栏/底部栏 → "报销" Tab                                │
│  操作：                                                          │
│    ① 查看报销仪表盘                                              │
│    ② 在"待处理"区域看到报销单卡片                                │
│    ③ 可点击展开查看关联的支出明细                                 │
│    ④ 可手动推进状态：草稿 → 提交 → 批准                          │
│  状态：报销单从 draft → submitted → approved                     │
│        （个人记账可跳过审批，直接到打款步骤）                      │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│  Step 4: 记录报销回款（闭环关键步骤）                             │
│  ────────────────────────────────                                │
│  入口：报销仪表盘 → 报销单卡片 → "记录回款"按钮                   │
│  操作：                                                          │
│    ① 弹出回款对话框                                              │
│    ② 系统自动填入回款金额 = 垫付总额（可改为部分金额）            │
│    ③ 选择到账账户（如"微信钱包"）                                │
│    ④ 选择到账日期                                                │
│    ⑤ 确认                                                       │
│  系统自动执行：                                                   │
│    → 创建一笔收入账单（type=income, 金额=回款金额,               │
│      reimbursementRole='income', reimbursementId=报销单ID）      │
│    → 更新报销单状态 → paid                                       │
│  结果：支出账单 badge 变为 [已报销 ¥2,150]                       │
│        收入账单显示 [报销回款] badge                              │
│        报销单移入"已完成"区域                                    │
│        账户余额自动增加（收入账单触发余额更新）                    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════════ │
│                        ✅ 闭环完成                               │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│  验证闭环完整性：                                                 │
│    支出侧：垫付 ¥2,150 → 已报销 ¥2,150 → badge 绿色             │
│    收入侧：报销回款 ¥2,150 → 进入微信钱包                        │
│    报销单：状态 = paid，可在"已完成"区域查看                      │
│    净影响：实际自付 = 0（全额报销时）                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 部分报销的闭环操作

```
场景：团建花费 ¥500，公司只报 ¥300

Step 1: 记录支出 ¥500（正常创建）
Step 2: 创建报销单，关联此支出
Step 3: 公司打款 ¥300
Step 4: 记录回款 → 金额改为 ¥300

结果：
  支出账单 badge: [部分报销 ¥300/¥500]
  收入账单 badge: [报销回款 ¥300]
  报销单显示: 垫付 ¥500 / 已报 ¥300 / 自付 ¥200
  净影响: 自付 ¥200
```

### 11.3 追加支出到已有报销单

```
场景：已创建"6月差旅报销"（机票+酒店），又发现一笔打车费

Step 1: 记录打车支出 ¥150
Step 2: 右键打车账单 → "加入报销单"
Step 3: 从列表中选择"6月差旅报销"
Step 4: 报销单总额自动更新为 ¥2,150

注意：报销单状态为 paid 后，不允许再追加支出（需先取消打款状态）
```

### 11.4 修正操作

| 修正场景 | 操作路径 |
|---------|---------|
| 加错了报销单 | 右键该支出 → "从报销单移除" → 加入正确的报销单 |
| 回款金额填错 | 删除报销回款的收入账单 → 报销单回到 approved → 重新记录回款 |
| 报销单创建错误 | 报销仪表盘 → 删除报销单（关联的支出账单恢复为未关联状态） |
| 整笔取消报销 | 报销仪表盘 → 取消报销单（状态变 cancelled，支出账单 badge 消失） |

### 11.5 操作入口汇总表

| 用户操作 | 入口位置 | 触发条件 |
|---------|---------|---------|
| 记录垫付支出 | 账单列表 → + 新建 | 无限制 |
| 单笔加入报销单 | 支出账单右键 → 加入报销单 | `type=expense && !reimbursementId` |
| 批量创建报销单 | 账单列表 → 批量选择 → 创建报销单 | 选中 ≥1 笔支出 |
| 查看报销仪表盘 | 侧边栏/底部栏 → 报销 Tab | 无限制 |
| 推进报销状态 | 报销仪表盘 → 报销单卡片 → 状态按钮 | 报销单未 paid |
| 记录回款 | 报销仪表盘 → 报销单 → 记录回款 | 报销单非 paid/cancelled |
| 从报销单移除 | 支出账单右键 → 从报销单移除 | `reimbursementId && role=expense` |
| 删除报销单 | 报销仪表盘 → 报销单 → 删除 | 报销单非 paid（paid 需先删除回款） |
| 查看报销关联 | 账单编辑弹窗 → 报销信息区域 | 账单有 reimbursementId |
| 筛选待报销支出 | 账单列表 → 报销筛选按钮 | 无限制 |
| 查看报销统计 | 账单统计栏 / 报销仪表盘顶部 | 无限制 |

---

## 十二、附录

### 12.1 新增文件清单（方案B）

| 文件路径 | 用途 |
|---------|------|
| `types/reimbursement.ts` | 报销单类型定义 |
| `composables/useReimburse.ts` | 报销单 CRUD 和聚合查询 |
| `app-modules/billing/components/ReimburseDashboard.vue` | 报销仪表盘页面 |
| `app-modules/billing/components/ReimburseGroupDialog.vue` | 创建/编辑报销单对话框 |
| `app-modules/billing/components/ReimburseIncomeDialog.vue` | 记录报销回款对话框 |
| `app-modules/billing/components/ReimburseStatusBadge.vue` | 报销状态徽章组件 |
| `app-modules/billing/components/ReimburseSummaryCard.vue` | 报销汇总统计卡片 |
| `app-modules/billing/components/ReimburseGroupItem.vue` | 报销单列表项组件 |

### 12.2 修改文件清单（方案B）

| 文件路径 | 修改内容 |
|---------|---------|
| `types/bill.ts` | 新增 reimbursementId, reimbursementRole 字段 |
| `composables/useBills.ts` | 新增按报销ID查询、创建回款账单方法 |
| `stores/billing.ts` | TabId 类型扩展，新增 'reimburse' |
| `app-modules/billing/BillingView.vue` | 新增报销面板路由和组件渲染 |
| `app-modules/billing/components/layout/BillingSidebar.vue` | 新增"报销"导航项 |
| `app-modules/billing/components/layout/BillingMobileTabbar.vue` | 移动端报销入口 |
| `app-modules/billing/components/panels/BillsTabPanel.vue` | 新增报销筛选、统计、对话框状态和事件处理 |
| `app-modules/billing/components/BillContextMenu.vue` | 新增"加入报销单"/"从报销单移除"菜单项 |
| `app-modules/billing/components/BillListItem.vue` | 新增报销状态 ReimburseStatusBadge |
| `app-modules/billing/components/BillList.vue` | 报销状态筛选；批量模式新增"创建报销单" |
| `app-modules/billing/components/BillDialog.vue` | 编辑模式展示报销关联信息 |

---

## 十三、导入场景补充

### 13.1 现状

`Bill` 类型上已有 `isReimbursable?: boolean` 字段（`types/bill.ts:113`），但**导入流程完全没有使用此字段**：

- `ImportRecordItem` 类型中无 `isReimbursable`
- `ImportPreviewRow.vue` 无"可报销"选项（仅有"可节省" `isSavable`）
- `MobileImportItemEditor.vue` 无"可报销"选项
- `createBillsBatch()` 构建 Bill 时不设置 `isReimbursable`
- `ImportRule` 和 `ImportRuleFormData` 中无 `isReimbursable`

> **参照实现**：`isSavable`（可节省）有完整的导入链路，可完全对齐其模式。

### 13.2 导入中支持报销标记

#### 需要修改的文件

| 文件 | 修改内容 | 类型 |
|------|---------|------|
| `types/bill.ts` | `ImportRecordItem` 接口新增 `isReimbursable?: boolean` | 修改 |
| `services/csvImport.ts` | `buildImportRecordItem()` 默认设置 `isReimbursable`（可通过规则覆盖） | 修改 |
| `app-modules/billing/components/ImportPreviewRow.vue` | 新增"可报销" checkbox（参照 `isSavable` 实现） | 修改 |
| `app-modules/billing/components/MobileImportItemEditor.vue` | 新增"可报销"开关（移动端） | 修改 |
| `composables/useBills.ts` | `createBillsBatch()` 构建 Bill 时传递 `isReimbursable` 字段 | 修改 |
| `types/bill.ts` | `ImportRule` / `ImportRuleFormData` 新增 `isReimbursable?: boolean` | 修改 |
| `composables/useImportRules.ts` | `applyRules()` / `buildRuleUpdates()` 传递 `isReimbursable` | 修改 |
| `app-modules/billing/components/ImportRuleForm.vue` | 规则表单新增"可报销"开关 | 修改 |

#### 导入规则扩展

用户可配置规则自动标记可报销支出：

```
规则示例：
  当交易对方 = "滴滴出行" → isReimbursable = true, categoryId = "交通出行"
  当说明包含 "出差"     → isReimbursable = true
  当付款方式 = "公司卡" → isReimbursable = false（公司卡非垫付）
```

#### 导入预览行 UI

```
现有 ImportPreviewRow：
  [分类选择] [账户选择] [可节省☑]

扩展后：
  [分类选择] [账户选择] [可节省☑] [可报销☑]   ← 新增
```

### 13.3 导入后的报销操作

导入完成后，标记为 `isReimbursable` 的支出账单会出现在账单列表中，用户可通过以下方式纳入报销单：

| 操作方式 | 说明 |
|---------|------|
| 批量筛选 + 创建 | 账单列表筛选"可报销" → 批量勾选 → "创建报销单" |
| 单笔右键 | 右键"可报销"的支出 → "加入报销单" |
| 导入后自动归集 | 导入完成确认后弹出提示："发现 N 笔可报销支出，是否创建报销单？" |

### 13.4 `isReimbursable` 与 `reimbursementId` 的关系

```
isReimbursable = true  →  此支出"可以"被报销（标记性质）
reimbursementId = "xxx" → 此支出"已经"归入某个报销单（关联性质）

状态流转：
  普通支出 → isReimbursable=true（标记可报销）→ reimbursementId="xxx"（加入报销单）→ 回款到账

两者独立：
  isReimbursable=true 但无 reimbursementId → 待报销但还没创建报销单
  isReimbursable=false 但有 reimbursementId → 不可报销但意外加入了（应提醒）
  isReimbursable=true 且有 reimbursementId → 正常报销流程中
```

### 13.5 闭环流程（含导入场景）

```
┌─────────────────────────────────────────────────────────────────┐
│                    含导入的完整闭环                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  方式一：手动记账                                                 │
│  记录支出 → 右键"加入报销单" → 记录回款 → 闭环                    │
│                                                                 │
│  方式二：CSV/微信/支付宝导入（新增）                               │
│  ─────────────────────────────────────                           │
│  ① 导入文件                                                     │
│     └→ 解析为 ImportRecord                                      │
│                                                                 │
│  ② 预览编辑                                                     │
│     ├→ 规则自动标记"可报销"（如交易对方=滴滴）                     │
│     ├→ 用户手动勾选"可报销" checkbox                             │
│     └→ isReimbursable = true                                    │
│                                                                 │
│  ③ 确认导入                                                     │
│     ├→ 创建 Bill（isReimbursable=true）                         │
│     └→ 支出出现在账单列表，显示 [可报销] 标记                     │
│                                                                 │
│  ④ 创建报销单                                                   │
│     ├→ 筛选"可报销" → 批量勾选 → 创建报销单                     │
│     └→ 或导入完成后弹窗提示"发现 N 笔可报销，创建报销单？"        │
│                                                                 │
│  ⑤ 记录回款 → 闭环                                              │
│     └→ 与手动记账流程一致                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 十四、预算排除规则

### 14.1 需求

**报销的支出不计入项目预算和分类预算。退款同样不计入。**

逻辑：如果一笔支出已经由公司报销（或商家退款），则它不应消耗我的预算额度。

### 14.2 现有统计口径分析

| 组件 | 排除父账单 | 扣除退款 | 排除报销 | 过滤 status |
|------|----------|---------|---------|------------|
| BudgetDashboard（分类预算） | ✅ | ✅ | ❌ | ❌ |
| ProjectBudgetDashboard（项目预算） | ✅ | ✅ | ❌ | ❌ |
| CategoryDetailView（分类详情） | ❌ | ❌ | ❌ | ✅ |

> ⚠️ CategoryDetailView 存在已知不一致：未排除 `hasChildren` 父账单（金额重复计算），未扣除退款。

### 14.3 排除规则定义

```
实际预算消耗 = 支出总额
             - 退款总额（isRefund=true && type=income 的关联收入）
             - 报销总额（有 reimbursementId && reimbursementRole='expense' 的支出中，已回款的部分）
             - 父账单（hasChildren=true，只计子账单）
```

**具体逻辑**：

| 账单状态 | 是否计入预算 | 说明 |
|---------|------------|------|
| 普通支出 | ✅ 计入 | 正常消耗预算 |
| 父账单（hasChildren） | ❌ 排除 | 只计子账单，避免重复 |
| 退款账单（isRefund=true） | ❌ 排除 | 已退回，不消耗预算 |
| 已退款的原账单 | ✅ 计入，但减去退款额 | 原支出仍消耗，退款部分不消耗 |
| 待报销支出（reimbursementId 有值，未回款） | ✅ 计入 | 还没拿到钱，仍消耗预算 |
| 已报销支出（reimbursementId 有值，报销单=paid） | ❌ 排除 | 公司已付款，不消耗我的预算 |
| 部分报销支出 | ✅ 计入差额 | 只计自付部分 |

**简化规则（推荐实现）**：

```typescript
// 实际预算消耗 = 全部支出 - 已退金额 - 已报金额
// 其中"已报"指报销单状态为 paid 的那部分
function calcBudgetActual(bills: Bill[], categoryId: string, year: number, month: number): number {
  const expenses = bills
    .filter(b => b.type === 'expense' && !b.hasChildren)
    .filter(b => matchMonth(b, year, month))
    .filter(b => b.categoryId === categoryId)
    .reduce((sum, b) => sum + b.amount, 0)

  // 扣除退款
  const refunds = bills
    .filter(b => b.type === 'income' && b.isRefund)
    .filter(b => matchMonth(b, year, month))
    .filter(b => b.categoryId === categoryId)
    .reduce((sum, b) => sum + b.amount, 0)

  // 扣除已报销（reimbursementRole=expense 且报销单已 paid）
  const reimbursed = bills
    .filter(b => b.type === 'expense' && b.reimbursementRole === 'expense' && b.reimbursementId)
    .filter(b => isReimbursementPaid(b.reimbursementId))  // 查报销单状态
    .filter(b => matchMonth(b, year, month))
    .filter(b => b.categoryId === categoryId)
    .reduce((sum, b) => sum + b.amount, 0)

  return expenses - refunds - reimbursed
}
```

### 14.4 关联修改的文件

| 文件 | 修改内容 | 说明 |
|------|---------|------|
| `BudgetDashboard.vue` | `getDirectActual()` 增加报销扣除逻辑 | 已有退款扣除，加一行报销扣除 |
| `ProjectBudgetDashboard.vue` | `getDirectActual()` 增加报销扣除逻辑 | 与 BudgetDashboard 对齐 |
| `CategoryDetailView.vue` | `totalAmount` 和 `budgetUsage` 增加：排除 hasChildren + 扣除退款 + 扣除报销 | 修复现有不一致 + 新增报销排除 |
| **新增** `utils/budgetCalc.ts` | 提取共享的预算统计函数 `calcBudgetActual()` | 消除三个组件的重复逻辑 |

### 14.5 提取共享统计函数（推荐）

当前 `getDirectActual` 在 BudgetDashboard 和 ProjectBudgetDashboard 中几乎完全相同（仅过滤维度不同），加上 CategoryDetailView 也有自己的实现。建议提取统一工具函数：

```typescript
// utils/budgetCalc.ts
interface BudgetActualOptions {
  bills: Bill[]
  dimension: 'category' | 'note'
  dimensionValue: string   // categoryId 或 noteId
  year: number
  month: number
  paidReimburseIds: Set<string>  // 已打款的报销单ID集合
}

function calcBudgetActual(options: BudgetActualOptions): number {
  // 统一实现：排除父账单 + 扣除退款 + 扣除已报销
}
```

三个组件统一调用此函数，确保统计口径一致。

### 14.6 用户体验变化

| 页面 | 变化前 | 变化后 |
|------|--------|--------|
| 分类预算仪表盘 | 实际支出 = 支出 - 退款 | 实际支出 = 支出 - 退款 - 已报销 |
| 项目预算仪表盘 | 实际支出 = 支出 - 退款 | 实际支出 = 支出 - 退款 - 已报销 |
| 分类详情页 | 总支出 = 所有支出（含父账单、含退款、含报销） | 总支出 = 子账单支出 - 退款 - 已报销 |
| 预算使用率 | 可能虚高 | 准确反映"自付"部分 |
