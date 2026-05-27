# 待办类型管理功能

## 概述
新增了完整的待办类型管理功能，允许用户创建、编辑和删除待办类型，为待办任务提供分类和组织能力。

## 新增功能

### 1. 数据库支持
- 在 `services/db.ts` 中添加了 `todo_types` 集合
- 支持按排序和创建时间索引

### 2. 待办类型组件
- **TodoTypeManager.vue**: 完整的待办类型管理组件
  - 创建新待办类型
  - 编辑现有待办类型
  - 删除待办类型
  - 支持自定义图标、颜色和描述
  - 拖拽排序支持（预留）

### 3. API 接口
- `GET /api/todo-types`: 获取所有待办类型
- `POST /api/todo-types`: 创建新待办类型
- `PATCH /api/todo-types/[id]`: 更新待办类型
- `DELETE /api/todo-types/[id]`: 删除待办类型

### 4. Composable
- **useTodoTypes**: 待办类型管理的组合函数
  - `todoTypes`: 所有待办类型
  - `sortedTypes`: 按排序的待办类型
  - `defaultTypes`: 默认待办类型
  - `loadTodoTypes()`: 加载待办类型
  - `getTodoTypeById(id)`: 根据ID获取待办类型

### 5. 类型定义
- **types/todo.ts**: 待办类型和待办项的TypeScript接口定义

### 6. 页面集成
- **todo.vue**: 在待办页面添加了"类型管理"按钮
- **todo-types.vue**: 新增待办类型管理页面

## 使用方式

### 1. 在待办页面
访问待办页面 (`/todo`)，点击右上角的"类型管理"按钮即可打开待办类型管理界面。

### 2. 独立管理页面
也可以直接访问 `/todo-types` 页面进行待办类型管理。

### 3. 创建待办类型
1. 点击"创建新待办类型"按钮
2. 填写类型名称
3. 选择图标和颜色
4. 可选填写描述
5. 点击"保存"

### 4. 编辑待办类型
1. 点击待办类型卡片上的编辑按钮
2. 修改相关信息
3. 点击"保存"

### 5. 删除待办类型
1. 点击待办类型卡片上的删除按钮
2. 确认删除操作

## 数据结构

### TodoType
```typescript
interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  order: number
  createdAt: string
  updatedAt: string
}
```

### TodoItem (扩展)
```typescript
interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
  typeId?: string  // 新增：待办类型ID
}
```

## 预设配置

### 图标选项
- solar:check-circle-linear (默认)
- solar:star-circle-linear
- solar:flag-linear
- solar:clock-circle-linear
- solar:heart-circle-linear
- solar:alert-circle-linear
- solar:bolt-circle-linear
- solar:calendar-circle-linear
- solar:target-linear
- solar:document-text-linear

### 颜色选项
- #3b82f6 (蓝色 - 默认)
- #8b5cf6 (紫色)
- #ec4899 (粉色)
- #ef4444 (红色)
- #f97316 (橙色)
- #eab308 (黄色)
- #22c55e (绿色)
- #14b8a6 (青色)
- #06b6d4 (深青色)
- #6366f1 (靛蓝色)

## 技术细节

### 响应式设计
- 支持移动端和桌面端
- 自适应布局
- 触摸友好的交互

### 性能优化
- 使用Vue 3 Composition API
- 响应式数据管理
- 懒加载和缓存

### 错误处理
- 完整的错误捕获和显示
- 用户友好的错误提示
- 数据验证

## 扩展性

### 未来可能的扩展
1. 待办类型的层级关系
2. 待办类型的权限控制
3. 待办类型的模板功能
4. 待办类型的统计和分析
5. 待办类型的导入导出

## 注意事项

1. 删除待办类型时不会影响已创建的待办项
2. 待办类型的排序会在创建时自动分配
3. 颜色和图标支持自定义，但建议使用预设选项以保持界面一致性