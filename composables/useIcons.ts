/**
 * 图标名称常量
 * 所有图标名称从 icones.js.org 验证后添加
 * 使用类型安全避免拼写错误
 */
export const ICONS = {
  // === 文本编辑 ===
  textBold: 'solar:text-bold-linear',
  textItalic: 'solar:text-italic-linear',
  textUnderline: 'solar:text-underline-linear',
  textStrikeThrough: 'solar:text-cross-linear',

  // === 列表 ===
  list: 'solar:list-linear',
  sortVertical: 'solar:sort-vertical-linear',

  // === 文档/笔记 ===
  document: 'solar:document-linear',
  documentText: 'solar:document-text-linear',
  notebook: 'solar:notebook-linear',
  clipboardList: 'solar:clipboard-list-linear',

  // === 操作 ===
  addCircle: 'solar:add-circle-linear',
  checkCircle: 'solar:check-circle-linear',
  closeCircle: 'solar:close-circle-linear',
  closeCircleBold: 'solar:close-circle-bold',
  pen: 'solar:pen-linear',
  trashBin: 'solar:trash-bin-trash-linear',
  trashBinMinimalistic: 'solar:trash-bin-minimalistic-linear',
  refresh: 'solar:refresh-linear',
  refreshCircle: 'solar:refresh-linear',
  callSplit: 'solar:transfer-horizontal-linear',
  fileImport: 'solar:file-import-linear',

  // === 导航/箭头 ===
  altArrowLeft: 'solar:alt-arrow-left-linear',
  altArrowRight: 'solar:alt-arrow-right-linear',
  altArrowDown: 'solar:alt-arrow-down-linear',
  arrowUp: 'solar:arrow-up-linear',

  // === 搜索 ===
  magnifer: 'solar:magnifer-linear',
  minimalisticMagnifer: 'solar:minimalistic-magnifer-linear',

  // === 菜单 ===
  hamburgerMenu: 'solar:hamburger-menu-linear',
  menuDots: 'solar:menu-dots-linear',

  // === 链接/工具 ===
  link: 'solar:link-linear',
  eraser: 'solar:eraser-linear',
  library: 'solar:library-linear',

  // === 日历 ===
  calendar: 'solar:calendar-linear',

  // === 文件夹/工作空间 ===
  folder2: 'solar:folder-2-linear',

  // === 设置/认证 ===
  settings: 'solar:settings-linear',
  login2: 'solar:login-2-linear',
  logout2: 'solar:logout-2-linear',

  // === 账单 ===
  walletMoney: 'solar:wallet-money-linear',
  money: 'solar:money-bag-linear',

  // === 目标 ===
  target: 'solar:target-linear',

  // === 状态/警告 ===
  dangerCircle: 'solar:danger-circle-linear',

  // === 圆形 ===
  round: 'solar:round-linear',
} as const

export type IconName = typeof ICONS[keyof typeof ICONS]

/**
 * Solar 图标集合
 */
export const SOLAR_ICONS = {
  // 文本编辑
  editor: {
    bold: ICONS.textBold,
    italic: ICONS.textItalic,
    underline: ICONS.textUnderline,
    strikeThrough: ICONS.textStrikeThrough,
    link: ICONS.link,
    eraser: ICONS.eraser,
  },

  // 列表
  list: {
    bullet: ICONS.list,
    ordered: ICONS.sortVertical,
  },

  // 导航
  nav: {
    back: ICONS.altArrowLeft,
    forward: ICONS.altArrowRight,
    right: ICONS.altArrowRight,
    left: ICONS.altArrowLeft,
    down: ICONS.altArrowDown,
    up: ICONS.arrowUp,
  },

  // 操作
  action: {
    add: ICONS.addCircle,
    edit: ICONS.pen,
    delete: ICONS.trashBin,
    close: ICONS.closeCircle,
    save: ICONS.checkCircle,
    refresh: ICONS.refreshCircle,
    split: ICONS.callSplit,
  },

  // 文档
  doc: {
    default: ICONS.document,
    text: ICONS.documentText,
    notebook: ICONS.notebook,
    clipboard: ICONS.clipboardList,
  },

  // 搜索
  search: {
    default: ICONS.magnifer,
    minimal: ICONS.minimalisticMagnifer,
  },

  // 菜单
  menu: {
    hamburger: ICONS.hamburgerMenu,
    dots: ICONS.menuDots,
  },

  // 设置
  settings: {
    gear: ICONS.settings,
    login: ICONS.login2,
    logout: ICONS.logout2,
  },

  // 工作空间
  workspace: {
    folder: ICONS.folder2,
  },

  // 账单
  billing: {
    wallet: ICONS.walletMoney,
    calendar: ICONS.calendar,
  },

  // 金融
  finance: {
    money: ICONS.money,
  },

  // 目标
  goal: {
    target: ICONS.target,
  },

  // 状态
  status: {
    success: ICONS.checkCircle,
    error: ICONS.dangerCircle,
    warning: ICONS.closeCircle,
    pending: ICONS.round,
  },
} as const
