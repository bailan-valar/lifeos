import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const version = '1.1.0'
const releaseDate = new Date('2026-05-19')

const changelogs = [
  {
    version,
    type: 'feature',
    title: '新增首页仪表盘功能',
    description: '新增首页仪表盘，提供数据概览与快捷入口。',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增设置页面和反馈功能',
    description: '- 添加 settings 模块组件和页面\n- 添加反馈提交 API 和相关功能\n- 新增 VirtualList 组件用于虚拟滚动',
    releaseDate,
  },
  {
    version,
    type: 'improvement',
    title: '页面头部操作模块化及导入记录快捷创建规则',
    description: '- 重构 pageHeader store 支持多模块独立注册操作（actionsMap）\n- 记账模块使用 BILLING_MODULE_KEY 隔离操作\n- 导入记录详情新增"创建规则"快捷入口\n- RuleDialog 支持 initialForm 预设数据',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '重构设置页面与反馈系统',
    description: '- 重新设计设置首页，增加快速入口和关于区域\n- 完善通用设置与账户设置页面\n- 反馈系统支持状态追踪与回复展示\n- 新增独立反馈提交弹窗与删除接口',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增管理员系统和反馈管理功能',
    description: '- 在 User 模型中添加角色系统 (admin/user)\n- 新增完整的管理员后台界面 (/__admin 路径)：用户管理、反馈管理、统计仪表盘\n- 新增反馈回复功能，支持用户和管理员双向交流\n- 添加管理员权限中间件和 API 保护\n- 更新认证系统，在登录/注册时返回用户角色\n- 新增侧边栏权限过滤，仅管理员可见管理入口',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '反馈系统升级为对话模式，支持多轮回复',
    description: '- 用户端 FeedbackForm 增加对话气泡 UI，支持展开/收起、发送回复\n- 管理端 FeedbackDetailDialog 加载完整对话记录\n- 新增管理员获取回复列表 API\n- 导入记录详情使用 VirtualList 优化长列表性能\n- 反馈列表点击查看改为弹窗而非跳转',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '账单导入支持备注编辑及分类结构调整',
    description: '- 导入预览和记录增加 remark 字段，支持逐行编辑备注\n- 备注内容与描述在导入时自动拼接\n- 导入记录详情弹框内支持备注编辑、展示\n- 调整默认分类：鲜花归入礼物子分类',
    releaseDate,
  },
  {
    version,
    type: 'improvement',
    title: '优化 Liquid Glass 设计样式并增强认证功能',
    description: '- 统一记账模块和管理员组件的 Liquid Glass 样式\n- 新增 .liquid-glass-select 类，规范下拉框 UI\n- 优化移动端抽屉和管理菜单的样式\n- 增强工作空间认证服务和 token 刷新机制\n- 新增管理员调试 API 端点',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增更新日志系统并引入 SelectPicker 组件',
    description: '- 新增 Changelog 系统：包含管理后台 CRUD、前端展示对话框和侧边栏徽章\n- 新增 SelectPicker 组件：替代原生 select，提供一致的 Liquid Glass 风格\n- 迁移表单组件：AccountForm、BillForm、BudgetForm、Admin 表单等改用 SelectPicker\n- 优化 DateTimePicker：时分输入支持单数字选中替换模式\n- 优化 liquid-glass-select 样式：hover 和 focus 状态更精细',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增 API Token 管理功能',
    description: '- 添加 ApiToken 数据模型（支持名称、过期时间、最后使用时间）\n- 认证系统支持 API Token 和 JWT 双重认证\n- 新增 API 端点：创建/列表/删除 Token\n- 设置页面新增 API Token 管理界面\n- Token 生成格式：lifeos_<base64url-random-32b>\n- 用户最多创建 10 个 Token，支持设置过期时间',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增 BaseDialog 组件并重构记账模块弹窗',
    description: '- 新增 BaseDialog 通用弹窗组件，支持移动端/桌面端自适应\n- BillDialog 使用 BaseDialog 重构，代码更简洁\n- 优化 AccountPicker/CategoryPicker/NotePicker 性能（合并 watchers、减少不必要的 RAF）\n- API 设置页面复制功能增强，支持降级方案和复制状态反馈',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '新增图标常量系统和富文本编辑器',
    description: '- 新增 composables/useIcons.ts 类型安全图标常量系统\n- 新增 components/editor/RichTextEditor.vue 富文本编辑器组件\n- 优化更新日志系统：ChangelogBadge 和 ChangelogItem 组件改进\n- 完善深色模式样式变量：新增 --liquid-text-tertiary-dark',
    releaseDate,
  },
  {
    version,
    type: 'improvement',
    title: '优化账单列表 UI 并新增 API 文档',
    description: '- 重构 BillList 布局，新增分类和账户信息显示\n- 修复 RichTextEditor 重载问题\n- 配置本地图标集避免 CDN 延迟\n- 新增 API 文档（README/admin/auth/tokens/changelog）',
    releaseDate,
  },
  {
    version,
    type: 'feature',
    title: '支持账单拆分、分摊与退款功能',
    description: '- 新增账单拆分：按分类拆分为多笔子账单（BillSplitDialog）\n- 新增账单分摊：跨期分摊金额到多个月份（BillAllocateDialog）\n- 新增账单退款：创建退款关联记录（BillRefundDialog、useBillRefunds）\n- 扩展账单类型：增加 parentId、hasChildren、allocatedMonth、isRefund 等字段\n- 调整统计逻辑：只统计叶子节点账单，排除有子账单的父账单\n- 新增 decimal.js 依赖用于金额精确计算',
    releaseDate,
  },
]

async function main() {
  // 检查是否已存在相同版本的记录
  const existing = await prisma.changelog.findMany({
    where: { version },
  })

  if (existing.length > 0) {
    console.log(`版本 ${version} 已存在 ${existing.length} 条记录，跳过插入`)
    console.log('已有记录：')
    existing.forEach(e => console.log(`  - ${e.title}`))
    return
  }

  const result = await prisma.changelog.createMany({
    data: changelogs,
  })

  console.log(`成功插入 ${result.count} 条更新日志记录（版本 ${version}）`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
