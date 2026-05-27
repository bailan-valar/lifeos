# 周视图功能文档

## 概述
类似滴答清单的周视图功能，提供直观的周计划管理界面。

## 功能特性

### 1. 周视图显示
- 一周7天的垂直列布局
- 每天显示对应的日期和星期
- 高亮显示今天的日期
- 显示当前周的标题和日期范围

### 2. 任务管理
- **任务显示**: 每天显示对应的待办任务
- **任务状态**: 支持完成/未完成状态切换
- **任务优先级**: 支持无、低、中、高四个优先级
- **任务类型**: 支持为任务分配类型（来自待办类型管理）
- **任务来源**: 显示任务所属的笔记标题

### 3. 任务操作
- **创建任务**: 点击"添加任务"按钮或右下角悬浮按钮
- **编辑任务**: 点击任务右侧的编辑按钮
- **完成任务**: 点击任务左侧的复选框
- **查看详情**: 点击任务可以跳转到对应的笔记
- **拖拽移动**: 支持将任务拖拽到不同日期

### 4. 界面交互
- **响应式设计**: 支持桌面和移动端
- **平滑动画**: 模态框和任务操作有流畅的动画效果
- **悬浮按钮**: 右下角的快速添加按钮
- **今天按钮**: 快速跳转到当前周

## 数据结构

### TodoItem
```typescript
interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  dueDate?: string
  typeId?: string
  priority?: 'none' | 'low' | 'medium' | 'high'
  parentId?: string
  noteId?: string
}
```

### TaskWithType
```typescript
interface TaskWithType extends TodoItem {
  noteTitle?: string
  typeName?: string
  typeIcon?: string
  typeColor?: string
}
```

## 使用方法

### 在时间视图中使用
```vue
<WeekView 
  :week-start="weekStart"
  @select-date="handleDateSelect"
/>
```

### Composable函数
```typescript
const {
  loading,
  error,
  loadTodosByDateRange,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  getTodayStats,
  getWeekStats
} = useTodos()
```

## 样式特性
- 毛玻璃背景效果
- 渐变色彩主题
- 平滑的过渡动画
- 响应式布局
- 触摸友好的交互

## 技术实现
- Vue 3 Composition API
- TypeScript
- Tailwind CSS
- PouchDB 数据存储
- 拖拽 API

## 未来增强
- [ ] 时间轴视图（显示具体时间点）
- [ ] 任务搜索和过滤
- [ ] 任务标签支持
- [ ] 重复任务设置
- [ ] 任务提醒功能
- [ ] 协作功能
- [ ] 数据统计和报表
