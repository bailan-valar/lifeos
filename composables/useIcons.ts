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
  checkCircleBold: 'solar:check-circle-bold',
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
  handle: 'solar:hamburger-menu-linear',

  // === 链接/工具 ===
  link: 'solar:link-linear',
  eraser: 'solar:eraser-linear',
  library: 'solar:library-linear',

  // === 日历 ===
  calendar: 'solar:calendar-linear',

  // === 文件夹/工作空间 ===
  folder: 'solar:folder-linear',
  folderOpen: 'solar:folder-open-linear',
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
  clockCircle: 'solar:clock-circle-linear',
  heart: 'solar:heart-linear',
  history: 'solar:history-linear',
  playCircle: 'solar:play-circle-linear',
  pauseCircle: 'solar:pause-circle-linear',
  infoCircle: 'solar:info-circle-linear',
  starCircle: 'solar:star-circle-linear',

  // === 状态/警告 ===
  dangerCircle: 'solar:danger-circle-linear',

  // === 加载 ===
  loading: 'solar:refresh-linear',

  // === 圆形 ===
  round: 'solar:info-circle-linear',
  circle: 'solar:circle-linear',

  // === 其他 ===
  book: 'solar:book-bookmark-linear',
  bookBookmark: 'solar:book-bookmark-linear',
  layers: 'solar:layers-linear',
  info: 'solar:info-circle-linear',
  checkRead: 'solar:check-read-linear',
  chart: 'solar:chart-linear',
  focus: 'solar:eye-linear',

  // === 用户/群组 ===
  usersGroupRounded: 'solar:users-group-rounded-linear',
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
    handle: ICONS.handle,
    circle: ICONS.circle,
  },

  // 文档
  doc: {
    default: ICONS.document,
    text: ICONS.documentText,
    notebook: ICONS.notebook,
    clipboard: ICONS.clipboardList,
    folder: ICONS.folder,
    folderOpen: ICONS.folderOpen,
    book: ICONS.book,
    bookmark: ICONS.bookBookmark,
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
    pending: 'solar:info-circle-linear',
    loading: ICONS.loading,
    play: ICONS.playCircle,
  },

  // 时间
  time: {
    clock: ICONS.clockCircle,
  },

  // 信息
  info: {
    info: ICONS.infoCircle,
  },

  // 图层
  layer: {
    layers: ICONS.layers,
  },
} as const

/**
 * 预设图标组 — 用于 IconPicker 组件
 */
export const PRESET_ICON_SETS = {
  // 笔记类图标
  class: [
    'solar:document-text-linear',
    'solar:folder-linear',
    'solar:user-linear',
    'solar:buildings-linear',
    'solar:book-linear',
    'solar:calendar-linear',
    'solar:tag-linear',
    'solar:star-linear',
    'solar:heart-linear',
    'solar:bolt-linear',
    'solar:code-linear',
    'solar:gallery-wide-linear',
  ] as const,

  // 待办类型图标
  todo: [
    'solar:check-circle-linear',
    'solar:star-circle-linear',
    'solar:flag-linear',
    'solar:clock-circle-linear',
    'solar:heart-circle-linear',
    'solar:alert-circle-linear',
    'solar:bolt-circle-linear',
    'solar:calendar-circle-linear',
    'solar:target-linear',
    'solar:document-text-linear',
    'solar:briefcase-linear',
    'solar:home-smile-linear',
    'solar:shop-linear',
    'solar:health-linear',
    'solar:graduation-cap-linear',
  ] as const,

  // 记账分类/账户图标
  billing: [
    'solar:wallet-linear',
    'solar:card-linear',
    'solar:cart-linear',
    'solar:bag-linear',
    'solar:home-linear',
    'solar:kick-scooter-linear',
    'solar:cpu-linear',
    'solar:bolt-linear',
    'solar:heart-linear',
    'solar:star-linear',
    'solar:chef-hat-linear',
    'solar:cup-hot-linear',
    'solar:bus-linear',
    'solar:health-linear',
    'solar:book-linear',
    'solar:gift-linear',
  ] as const,
} as const

export type PresetIconSet = keyof typeof PRESET_ICON_SETS

/**
 * 预设颜色 — 用于待办类型、笔记分类等
 */
export const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
] as const
