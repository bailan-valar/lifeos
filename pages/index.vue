<script setup lang="ts">
import { ref, computed } from 'vue'
import PersonalPanel from '~/components/dashboard/PersonalPanel.vue'
import StatCard from '~/components/dashboard/StatCard.vue'

// 顶部 Header 数据
const greeting = '早安，Shirley 🌱'
const todayDate = '今天是 2024年5月22日 星期三'
const weather = { temp: '24°C', condition: '多云', aqi: '优' }
const mood = { label: '平静', emoji: '😊' }
const energy = { current: 72, max: 100 }

// 统计卡片数据
const statCards = [
  {
    icon: 'solar:clock-circle-linear',
    label: '专注时长',
    value: '3.6 h',
    target: '今日目标 6h',
    iconBg: 'rgba(100, 180, 200, 0.15)',
    iconColor: 'rgb(80, 160, 180)',
    chartType: 'bar' as const,
    barData: [30, 55, 40, 80, 50, 70, 45],
    barColor: 'rgb(100, 180, 200)',
  },
  {
    icon: 'solar:heart-linear',
    label: '完成任务',
    value: '6 / 10',
    target: '今日目标 10个',
    iconBg: 'rgba(220, 120, 120, 0.15)',
    iconColor: 'rgb(200, 100, 100)',
    chartType: 'ring' as const,
    ringPercent: 60,
    ringColor: 'rgb(220, 120, 120)',
    ringIcon: 'solar:check-read-linear',
  },
  {
    icon: 'solar:book-linear',
    label: '学习时长',
    value: '2.8 h',
    target: '今日目标 4h',
    iconBg: 'rgba(120, 140, 220, 0.15)',
    iconColor: 'rgb(100, 120, 200)',
    chartType: 'bar' as const,
    barData: [25, 45, 60, 35, 50, 40, 55],
    barColor: 'rgb(120, 140, 220)',
  },
  {
    icon: 'solar:running-linear',
    label: '运动时长',
    value: '45 min',
    target: '今日目标 60min',
    iconBg: 'rgba(220, 160, 80, 0.15)',
    iconColor: 'rgb(200, 140, 60)',
    chartType: 'ring' as const,
    ringPercent: 75,
    ringColor: 'rgb(220, 160, 80)',
    ringIcon: 'solar:bolt-linear',
  },
  {
    icon: 'solar:book-bookmark-linear',
    label: '阅读页数',
    value: '32 页',
    target: '今日目标 50页',
    iconBg: 'rgba(120, 180, 100, 0.15)',
    iconColor: 'rgb(100, 160, 80)',
    chartType: 'ring' as const,
    ringPercent: 64,
    ringColor: 'rgb(120, 180, 100)',
    ringIcon: 'solar:notes-linear',
  },
]

// 任务数据
const taskFilter = ref('全部')
const taskFilters = ['全部', '学习', '研究', '生活', '成长', '健康']

const filteredTasks = computed(() => {
  if (taskFilter.value === '全部') return tasks.value
  const map: Record<string, string> = { '学习': '学习', '研究': '研究', '生活': '生活', '成长': '成长', '健康': '健康' }
  return tasks.value.filter(t => t.category === map[taskFilter.value])
})

interface Task {
  id: number
  title: string
  category: string
  level: string
  time: string
  done: boolean
}

const tasks = ref<Task[]>([
  { id: 1, title: '阅读文献：Emotion Support System 综述', category: '研究', level: '重要', time: '45min', done: true },
  { id: 2, title: '整理大纲：虚拟人情绪表达机制', category: '研究', level: '重要', time: '60min', done: false },
  { id: 3, title: '写作：论文引言部分初稿', category: '研究', level: '重要', time: '90min', done: false },
  { id: 4, title: '温习：雅思词汇（50个）', category: '学习', level: '中等', time: '30min', done: true },
  { id: 5, title: '运动：有氧 + 拉伸', category: '健康', level: '中等', time: '60min', done: true },
  { id: 6, title: '冥想：正念呼吸练习', category: '成长', level: '低', time: '15min', done: false },
  { id: 7, title: '整理每日计划与复盘', category: '生活', level: '低', time: '20min', done: false },
])

const completedCount = computed(() => tasks.value.filter(t => t.done).length)
const totalCount = computed(() => tasks.value.length)

function toggleTask(id: number) {
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    '研究': 'bg-sky-100 text-sky-700',
    '学习': 'bg-emerald-100 text-emerald-700',
    '健康': 'bg-green-100 text-green-700',
    '生活': 'bg-orange-100 text-orange-700',
    '成长': 'bg-purple-100 text-purple-700',
  }
  return map[cat] || 'bg-gray-100 text-gray-700'
}

const levelColor = (level: string) => {
  const map: Record<string, string> = {
    '重要': 'text-red-500',
    '中等': 'text-amber-500',
    '低': 'text-gray-400',
  }
  return map[level] || 'text-gray-400'
}

// 时间轴数据
const timeline = [
  { start: '09:00', end: '10:30', title: '文献阅读与笔记整理', subtitle: 'Emotion Support System', dotColor: 'bg-emerald-400' },
  { start: '10:45', end: '12:15', title: '虚拟人情绪表达机制大纲', subtitle: '', dotColor: 'bg-sky-400' },
  { start: '14:00', end: '15:30', title: '论文写作：引言部分', subtitle: '', dotColor: 'bg-amber-400' },
  { start: '16:00', end: '16:30', title: '运动训练', subtitle: '', dotColor: 'bg-orange-400' },
  { start: '19:30', end: '20:00', title: '雅思词汇温习', subtitle: '', dotColor: 'bg-purple-400' },
  { start: '21:00', end: '21:30', title: '冥想 & 复盘总结', subtitle: '', dotColor: 'bg-rose-300' },
]

// 研究方向数据
const researchItems = [
  {
    title: '情绪支持系统',
    subtitle: '(Empathic Support System)',
    desc: '探索如何通过设计与技术，提供个性化、共情式的情绪支持体验。',
    progress: 70,
    icon: 'solar:leaf-linear',
    iconBg: 'linear-gradient(135deg, rgba(120,180,100,0.3), rgba(80,140,100,0.2))',
  },
  {
    title: '虚拟人技术',
    subtitle: '(Virtual Human Technology)',
    desc: '研究虚拟人在情感表达、交互信任与社会影响中的应用与潜力。',
    progress: 60,
    icon: 'solar:ghost-linear',
    iconBg: 'linear-gradient(135deg, rgba(180,180,200,0.3), rgba(140,140,180,0.2))',
  },
  {
    title: '人机共情交互',
    subtitle: '(HCI & Empathic Interaction)',
    desc: '关注人机之间的情感连接、信任建立与共情体验的设计方法。',
    progress: 50,
    icon: 'solar:chat-square-like-linear',
    iconBg: 'linear-gradient(135deg, rgba(200,160,200,0.3), rgba(160,120,160,0.2))',
  },
]

// 运动计划数据
const exercise = { current: 45, target: 60, label: '今日运动', unit: 'min' }

// 能量状态
const energyState = { value: 72, max: 100, label: '当前能量值', advice: '适当休息能让能量更好地恢复哦~' }

// 写作大纲数据
interface OutlineNode {
  id: string
  title: string
  badge?: string
  children?: OutlineNode[]
}

const outlineItems: OutlineNode[] = [
  { id: '1', title: '博士研究计划书大纲', children: [
    { id: '1-1', title: '研究背景与意义', children: [
      { id: '1-1-1', title: '1.1 情绪支持系统的现状' },
      { id: '1-1-2', title: '1.2 虚拟人技术的发展', badge: '正在撰写...' },
    ]},
    { id: '1-2', title: '2. 研究问题与目标' },
    { id: '1-3', title: '3. 研究方法与设计' },
    { id: '1-4', title: '4. 预期贡献与创新点' },
    { id: '1-5', title: '5. 时间计划与可行性分析' },
  ]},
]

const writingStats = { weekly: '6.2 h', words: '8,430', nodes: '12 / 28' }

// AI 伙伴数据
const aiMessages = [
  { sender: 'ai', text: 'Shirley，看到你今天完成了运动任务！身体和大脑都需要照顾好哦~要不要听一段专注白噪音，一起开始下一段任务呀？' },
]

const aiActions = [
  { label: '专注陪伴', icon: 'solar:clock-circle-linear' },
  { label: '情绪支持', icon: 'solar:heart-linear' },
  { label: '灵感对话', icon: 'solar:stars-linear' },
]

// 底部数据
const quote = '慢慢来，比较快。你正在成为你想成为的人。☕'
const focusDays = 14
const nextBadgeDays = 6

const musicTrack = { title: '森林白噪音', subtitle: '专注 · 放松 · 睡眠' }
const isPlaying = ref(false)

const badges = [
  { icon: 'solar:leaf-linear', color: 'text-green-600' },
  { icon: 'solar:star-linear', color: 'text-amber-500' },
  { icon: 'solar:fire-linear', color: 'text-orange-500' },
  { icon: 'solar:book-linear', color: 'text-sky-500' },
  { icon: 'solar:medal-ribbon-star-linear', color: 'text-purple-500' },
]
</script>

<template>
  <div class="dashboard-page">
    <PersonalPanel class="personal-panel-desktop" />

    <main class="dashboard-main">
      <!-- 顶部 Header -->
      <header class="dashboard-header">
        <div class="header-left">
          <div class="greeting">
            <Icon name="solar:sun-2-linear" size="22" class="greeting-icon" />
            {{ greeting }}
          </div>
          <div class="date-line">{{ todayDate }}</div>
        </div>
        <div class="header-right">
          <div class="weather-info">
            <Icon name="solar:cloud-sun-2-linear" size="20" />
            <span>{{ weather.temp }}</span>
            <span class="weather-detail">{{ weather.condition }}</span>
            <span class="weather-divider">·</span>
            <span class="weather-detail">空气质量：{{ weather.aqi }}</span>
          </div>
          <div class="header-divider" />
          <div class="mood-info">
            <span class="mood-label">今日心情</span>
            <span class="mood-emoji">{{ mood.emoji }}</span>
            <span class="mood-text">{{ mood.label }}</span>
          </div>
          <div class="header-divider" />
          <div class="energy-info">
            <span class="energy-label">能量值</span>
            <span class="energy-value">{{ energy.current }}/{{ energy.max }}</span>
            <div class="energy-bar">
              <div class="energy-fill" :style="{ width: (energy.current / energy.max * 100) + '%' }" />
            </div>
          </div>
        </div>
      </header>

      <!-- 统计卡片 -->
      <section class="stats-row">
        <StatCard
          v-for="card in statCards"
          :key="card.label"
          v-bind="card"
        />
      </section>

      <!-- 中间三栏 -->
      <section class="middle-row">
        <!-- 今日任务清单 -->
        <div class="panel task-panel">
          <div class="panel-header-row">
            <h3 class="panel-title">今日任务清单</h3>
            <div class="filter-tabs">
              <button
                v-for="f in taskFilters"
                :key="f"
                class="filter-tab"
                :class="{ active: taskFilter === f }"
                @click="taskFilter = f"
              >
                {{ f }}
              </button>
              <button class="filter-tab add-btn">
                <Icon name="solar:add-circle-linear" size="14" />
              </button>
            </div>
          </div>
          <TransitionGroup name="task" tag="div" class="task-list">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-item"
              :class="{ done: task.done }"
              @click="toggleTask(task.id)"
            >
              <div class="task-check" @click.stop="toggleTask(task.id)">
                <div class="check-circle" :class="{ checked: task.done }">
                  <Icon v-if="task.done" name="solar:check-circle-linear" size="12" />
                </div>
              </div>
              <span class="task-title" :class="{ done: task.done }">{{ task.title }}</span>
              <span class="task-tag" :class="categoryColor(task.category)">{{ task.category }}</span>
              <span class="task-level" :class="levelColor(task.level)">{{ task.level }}</span>
              <span class="task-time">{{ task.time }}</span>
            </div>
          </TransitionGroup>
          <div class="task-footer">
            <span>已完成 {{ completedCount }} / {{ totalCount }}</span>
            <div class="task-progress">
              <div class="task-progress-fill" :style="{ width: (completedCount / totalCount * 100) + '%' }" />
            </div>
          </div>
          <div class="task-quote">
            <Icon name="solar:leaf-linear" size="12" />
            每一个微小的进步，都是未来的礼物
            <Icon name="solar:leaf-linear" size="12" />
          </div>
        </div>

        <!-- 今日时间轴 -->
        <div class="panel timeline-panel">
          <div class="panel-header-row">
            <h3 class="panel-title">今日时间轴</h3>
            <button class="focus-mode-btn">
              <Icon name="solar:target-linear" size="14" />
              专注模式
            </button>
          </div>
          <div class="timeline-list">
            <div v-for="(item, i) in timeline" :key="i" class="timeline-item">
              <div class="timeline-time">
                <span>{{ item.start }}</span>
                <span class="time-end">{{ item.end }}</span>
              </div>
              <div class="timeline-dot" :class="item.dotColor" />
              <div class="timeline-content">
                <div class="timeline-title">{{ item.title }}</div>
                <div v-if="item.subtitle" class="timeline-subtitle">{{ item.subtitle }}</div>
              </div>
            </div>
          </div>
          <div class="timeline-quote">
            <Icon name="solar:chat-round-dots-linear" size="14" />
            「保持节奏，你正在创造改变。」
          </div>
        </div>

        <!-- 研究方向关注 -->
        <div class="panel research-panel">
          <div class="panel-header-row">
            <h3 class="panel-title">研究方向关注</h3>
            <button class="view-all-btn">
              查看全部
              <Icon name="solar:alt-arrow-right-linear" size="12" />
            </button>
          </div>
          <div class="research-list">
            <div v-for="item in researchItems" :key="item.title" class="research-card">
              <div class="research-icon" :style="{ background: item.iconBg }">
                <Icon :name="item.icon" size="18" />
              </div>
              <div class="research-info">
                <div class="research-title">{{ item.title }}</div>
                <div class="research-subtitle">{{ item.subtitle }}</div>
                <div class="research-desc">{{ item.desc }}</div>
                <div class="research-progress">
                  <div class="research-progress-fill" :style="{ width: item.progress + '%' }" />
                </div>
                <div class="research-percent">{{ item.progress }}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 底部三栏 -->
      <section class="bottom-row">
        <!-- 运动计划 -->
        <div class="panel exercise-panel">
          <div class="exercise-header">
            <span class="exercise-title">运动计划</span>
            <span class="exercise-title">拉伸放松</span>
            <span class="exercise-title">能量状态</span>
          </div>
          <div class="exercise-body">
            <div class="exercise-ring-wrap">
              <div class="exercise-ring">
                <svg viewBox="0 0 36 36" class="exercise-svg">
                  <path class="exercise-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    class="exercise-ring-fill"
                    :stroke-dasharray="`${(exercise.current / exercise.target * 100)}, 100`"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="exercise-ring-text">
                  <div class="exercise-ring-label">{{ exercise.label }}</div>
                  <div class="exercise-ring-value">{{ exercise.current }}</div>
                  <div class="exercise-ring-unit">{{ exercise.unit }}</div>
                </div>
              </div>
              <div class="exercise-target">目标 {{ exercise.target }} min</div>
              <button class="exercise-btn">
                开始运动
              </button>
            </div>
            <div class="stretch-section">
              <div class="stretch-item">
                <div class="stretch-icon">
                  <Icon name="solar:body-linear" size="20" />
                </div>
                <div class="stretch-info">
                  <div class="stretch-name">颈肩放松拉伸</div>
                  <div class="stretch-time">8 分钟</div>
                </div>
              </div>
              <button class="stretch-btn">
                开始拉伸
              </button>
            </div>
            <div class="energy-section">
              <div class="energy-mascot">
                <Icon name="solar:magic-stick-3-linear" size="32" class="mascot-icon" />
              </div>
              <div class="energy-detail">
                <div class="energy-detail-label">{{ energyState.label }}</div>
                <div class="energy-detail-value">{{ energyState.value }} / {{ energyState.max }}</div>
                <div class="energy-advice">{{ energyState.advice }}</div>
                <a class="energy-link">能量恢复建议</a>
              </div>
            </div>
          </div>
        </div>

        <!-- 写作大纲笔记 -->
        <div class="panel notes-panel">
          <div class="panel-header-row">
            <h3 class="panel-title">写作大纲笔记</h3>
            <button class="new-outline-btn">
              <Icon name="solar:add-circle-linear" size="14" />
              新建大纲
            </button>
          </div>
          <div class="outline-tree">
            <div v-for="node in outlineItems" :key="node.id" class="outline-node">
              <div class="outline-item">
                <Icon name="solar:document-text-linear" size="14" />
                <span>{{ node.title }}</span>
              </div>
              <div v-if="node.children" class="outline-children">
                <div v-for="child in node.children" :key="child.id" class="outline-child">
                  <div class="outline-item">
                    <span>{{ child.title }}</span>
                    <span v-if="child.badge" class="outline-badge">{{ child.badge }}</span>
                  </div>
                  <div v-if="child.children" class="outline-children">
                    <div v-for="sub in child.children" :key="sub.id" class="outline-sub">
                      <span>{{ sub.title }}</span>
                      <span v-if="sub.badge" class="outline-badge">{{ sub.badge }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="writing-stats">
            <div class="writing-stat-item">
              <div class="writing-stat-label">写作习惯统计</div>
              <div class="writing-stat-sub">本周写作时长</div>
              <div class="writing-stat-value">{{ writingStats.weekly }}</div>
            </div>
            <div class="writing-stat-item">
              <div class="writing-stat-sub">字数统计</div>
              <div class="writing-stat-value">{{ writingStats.words }}</div>
            </div>
            <div class="writing-stat-item">
              <div class="writing-stat-sub">大纲节点</div>
              <div class="writing-stat-value">{{ writingStats.nodes }}</div>
            </div>
          </div>
        </div>

        <!-- AI 伙伴 -->
        <div class="panel ai-panel">
          <div class="panel-header-row">
            <h3 class="panel-title">
              AI 伙伴小葵
              <Icon name="solar:leaf-linear" size="14" class="title-leaf" />
            </h3>
            <div class="ai-status">
              <span class="status-dot" />
              在线
            </div>
          </div>
          <div class="ai-chat">
            <div
              v-for="(msg, i) in aiMessages"
              :key="i"
              class="ai-message"
              :class="msg.sender"
            >
              <div v-if="msg.sender === 'ai'" class="ai-avatar">
                <Icon name="solar:ghost-linear" size="16" />
              </div>
              <div class="ai-bubble">{{ msg.text }}</div>
            </div>
          </div>
          <div class="ai-actions">
            <button
              v-for="action in aiActions"
              :key="action.label"
              class="ai-action-btn"
            >
              <Icon :name="action.icon" size="14" />
              {{ action.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- 最底部栏 -->
      <footer class="dashboard-footer">
        <div class="footer-quote">
          <span class="quote-label">今日寄语</span>
          <span class="quote-text">「{{ quote }}」</span>
        </div>
        <div class="footer-music">
          <div class="music-cover">
            <Icon name="solar:music-note-linear" size="16" />
          </div>
          <div class="music-info">
            <div class="music-title">{{ musicTrack.title }}</div>
            <div class="music-subtitle">{{ musicTrack.subtitle }}</div>
          </div>
          <div class="music-controls">
            <button><Icon name="solar:skip-previous-linear" size="16" /></button>
            <button class="play-btn" @click="isPlaying = !isPlaying">
              <Icon :name="isPlaying ? 'solar:pause-linear' : 'solar:play-linear'" size="18" />
            </button>
            <button><Icon name="solar:skip-next-linear" size="16" /></button>
            <button><Icon name="solar:reorder-linear" size="16" /></button>
          </div>
        </div>
        <div class="footer-focus">
          <div class="focus-info">
            <Icon name="solar:flame-linear" size="16" class="focus-icon" />
            <div>
              <div class="focus-days">连续专注天数</div>
              <div class="focus-number">{{ focusDays }} <span>天</span></div>
            </div>
          </div>
          <div class="focus-next">距离下一个成就还差 {{ nextBadgeDays }} 天！</div>
          <div class="focus-badges">
            <div v-for="(badge, i) in badges" :key="i" class="focus-badge" :class="badge.color">
              <Icon :name="badge.icon" size="14" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  height: 100%;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(250, 248, 240, 0.9) 0%, transparent 55%),
    radial-gradient(ellipse at 100% 100%, rgba(240, 248, 235, 0.7) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 50%, rgba(245, 242, 235, 0.5) 0%, transparent 65%);
}

.dashboard-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 15% 15%, rgba(120, 180, 100, 0.05) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 85%, rgba(200, 180, 140, 0.05) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 10%, rgba(255, 255, 255, 0.3) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.dashboard-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C8C76' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.dashboard-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 12px 12px;
  overflow-y: auto;
  position: relative;
}

/* 自定义滚动条 */
.dashboard-main::-webkit-scrollbar {
  width: 5px;
}
.dashboard-main::-webkit-scrollbar-track {
  background: transparent;
}
.dashboard-main::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}
.dashboard-main::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

/* ===== Header ===== */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 0 2px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.greeting {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  gap: 6px;
}

.greeting-icon {
  color: rgb(220, 180, 80);
  animation: sunPulse 3s ease-in-out infinite;
}

@keyframes sunPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.date-line {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  padding-left: 26px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.weather-detail {
  color: rgba(0, 0, 0, 0.4);
  font-size: 12px;
}

.weather-divider {
  color: rgba(0, 0, 0, 0.2);
}

.header-divider {
  width: 1px;
  height: 24px;
  background: rgba(0, 0, 0, 0.08);
}

.mood-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.mood-label {
  color: rgba(0, 0, 0, 0.4);
}

.mood-emoji {
  font-size: 16px;
}

.mood-text {
  color: rgba(0, 0, 0, 0.7);
  font-weight: 600;
}

.energy-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.energy-label {
  color: rgba(0, 0, 0, 0.4);
}

.energy-value {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  font-size: 12px;
}

.energy-bar {
  width: 60px;
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.energy-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(120, 180, 100), rgb(180, 210, 120));
  border-radius: 3px;
}

/* ===== Stats Row ===== */
.stats-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ===== Panel Base ===== */
.panel {
  position: relative;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.35) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
}

.panel > * {
  position: relative;
  z-index: 1;
}

.panel-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ===== Middle Row ===== */
.middle-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.9fr;
  gap: 10px;
  min-height: 0;
  flex: 1;
}

@media (max-width: 1280px) {
  .middle-row {
    grid-template-columns: 1fr 1fr;
  }
  .research-panel {
    grid-column: 1 / -1;
  }
  .research-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

@media (max-width: 900px) {
  .middle-row {
    grid-template-columns: 1fr;
  }
  .research-panel {
    grid-column: auto;
  }
  .research-list {
    grid-template-columns: 1fr;
  }
}

/* Task Panel */
.task-panel {
  min-height: 0;
}

.filter-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
}

.filter-tab {
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
}

.filter-tab:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.6);
}

.filter-tab.active {
  background: rgba(120, 160, 80, 0.1);
  color: rgb(80, 120, 60);
  font-weight: 600;
}

.add-btn {
  padding: 4px;
  color: rgba(0, 0, 0, 0.3);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  position: relative;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 8px;
  transition: background 0.15s ease;
  font-size: 11px;
}

.task-item:hover {
  background: rgba(120, 180, 100, 0.04);
}

.task-check {
  flex-shrink: 0;
}

.check-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.check-circle:hover {
  border-color: rgba(120, 180, 100, 0.5);
  box-shadow: 0 0 0 3px rgba(120, 180, 100, 0.1);
}

.check-circle.checked {
  background: rgb(120, 180, 100);
  border-color: rgb(120, 180, 100);
  transform: scale(1.05);
}

.task-title {
  flex: 1;
  min-width: 0;
  color: rgba(0, 0, 0, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-title.done {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.35);
}

.task-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.task-level {
  font-size: 10px;
  flex-shrink: 0;
  font-weight: 500;
}

.task-time {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

.task-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
  padding-top: 2px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.task-progress {
  flex: 1;
  height: 5px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(120, 180, 100), rgb(160, 210, 120));
  border-radius: 3px;
}

.task-quote {
  text-align: center;
  font-size: 10px;
  color: rgba(80, 120, 60, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* Timeline Panel */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  position: relative;
  padding-left: 4px;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 55px;
  top: 12px;
  bottom: 38px;
  width: 2px;
  background: linear-gradient(
    180deg,
    rgba(120, 180, 100, 0.25) 0%,
    rgba(120, 180, 100, 0.12) 50%,
    rgba(120, 180, 100, 0.04) 100%
  );
  border-radius: 1px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px;
  border-radius: 8px;
  transition: background 0.15s ease;
  position: relative;
  z-index: 1;
}

.timeline-item:hover {
  background: rgba(120, 180, 100, 0.04);
}

.timeline-time {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  min-width: 44px;
  text-align: right;
  flex-shrink: 0;
}

.time-end {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.3);
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 2;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.75);
  font-weight: 500;
}

.timeline-subtitle {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.35);
}

.timeline-quote {
  margin-top: auto;
  padding: 8px 10px;
  background: rgba(120, 180, 100, 0.08);
  border-radius: 10px;
  font-size: 11px;
  color: rgba(80, 120, 60, 0.7);
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0.5px solid rgba(120, 180, 100, 0.15);
}

.focus-mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.focus-mode-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* Research Panel */
.research-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.research-card {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  transition: transform 0.2s ease;
}

.research-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.research-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.research-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.research-title {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
}

.research-subtitle {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
}

.research-desc {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.research-progress {
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.research-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(120, 180, 100), rgb(160, 210, 120));
  border-radius: 2px;
}

.research-percent {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
  text-align: right;
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: color 0.15s ease;
}

.view-all-btn:hover {
  color: rgba(0, 0, 0, 0.6);
}

/* ===== Bottom Row ===== */
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr 0.9fr;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .bottom-row {
    grid-template-columns: 1fr 1fr;
  }
  .ai-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .bottom-row {
    grid-template-columns: 1fr;
  }
  .ai-panel {
    grid-column: auto;
  }
}

/* Exercise Panel */
.exercise-header {
  display: flex;
  gap: 12px;
  padding-bottom: 6px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.exercise-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: color 0.15s ease;
}

.exercise-title:hover {
  color: rgba(0, 0, 0, 0.8);
}

.exercise-body {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.exercise-ring-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.exercise-ring {
  position: relative;
  width: 68px;
  height: 68px;
}

.exercise-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.exercise-ring-bg {
  fill: none;
  stroke: rgba(0, 0, 0, 0.06);
  stroke-width: 3;
}

.exercise-ring-fill {
  fill: none;
  stroke: rgb(120, 180, 100);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.exercise-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.exercise-ring-label {
  font-size: 8px;
  color: rgba(0, 0, 0, 0.35);
}

.exercise-ring-value {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1;
}

.exercise-ring-unit {
  font-size: 8px;
  color: rgba(0, 0, 0, 0.4);
}

.exercise-target {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
}

.exercise-btn {
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(120, 180, 100, 0.15);
  color: rgb(80, 140, 60);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.exercise-btn:hover {
  background: rgba(120, 180, 100, 0.22);
}

.exercise-btn:active {
  transform: scale(0.96);
}

/* Stretch */
.stretch-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
}

.stretch-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stretch-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(200, 180, 160, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(120, 100, 80, 0.8);
}

.stretch-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stretch-name {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
}

.stretch-time {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
}

.stretch-btn {
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(200, 180, 160, 0.2);
  color: rgb(140, 120, 100);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stretch-btn:hover {
  background: rgba(200, 180, 160, 0.3);
}

.stretch-btn:active {
  transform: scale(0.96);
}

/* Energy */
.energy-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-top: 2px;
}

.energy-mascot {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(120, 180, 100, 0.15), rgba(200, 220, 180, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.mascot-icon {
  color: rgb(120, 160, 80);
}

.energy-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.energy-detail-label {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
}

.energy-detail-value {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
}

.energy-advice {
  font-size: 8px;
  color: rgba(0, 0, 0, 0.35);
  text-align: center;
  line-height: 1.3;
  max-width: 120px;
}

.energy-link {
  font-size: 8px;
  color: rgb(100, 160, 80);
  cursor: pointer;
  text-decoration: underline;
}

/* Notes Panel */
.outline-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.outline-node {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 5px;
  border-radius: 5px;
  color: rgba(0, 0, 0, 0.7);
  transition: background 0.1s ease;
}

.outline-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.outline-children {
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.outline-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-sub {
  padding: 2px 5px 2px 14px;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 5px;
}

.outline-badge {
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(120, 180, 100, 0.12);
  color: rgb(80, 140, 60);
  font-size: 8px;
}

.new-outline-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-outline-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.writing-stats {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  margin-top: auto;
}

.writing-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.writing-stat-label {
  font-size: 9px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.writing-stat-sub {
  font-size: 8px;
  color: rgba(0, 0, 0, 0.35);
}

.writing-stat-value {
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
}

/* AI Panel */
.ai-panel {
  min-height: 0;
}

.title-leaf {
  color: rgb(120, 160, 80);
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(80, 200, 100);
}

.ai-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.ai-message {
  display: flex;
  gap: 6px;
}

.ai-message.ai {
  align-items: flex-start;
}

.ai-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(120, 160, 80, 0.2), rgba(160, 200, 120, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(80, 120, 60);
  flex-shrink: 0;
}

.ai-bubble {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.4;
  border: 0.5px solid rgba(255, 255, 255, 0.5);
}

.ai-actions {
  display: flex;
  gap: 5px;
  padding-top: 2px;
}

.ai-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 5px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.35);
  font-size: 10px;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  transition: all 0.15s ease;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
}

.ai-action-btn:hover {
  background: rgba(255, 255, 255, 0.55);
  color: rgba(0, 0, 0, 0.75);
}

.ai-action-btn:active {
  transform: scale(0.96);
}

/* ===== Footer ===== */
.dashboard-footer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.25),
    0 4px 16px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  overflow: hidden;
}

.dashboard-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
}

.dashboard-footer > * {
  position: relative;
  z-index: 1;
}

.footer-quote {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.quote-label {
  color: rgba(0, 0, 0, 0.35);
  font-weight: 500;
}

.quote-text {
  color: rgba(0, 0, 0, 0.55);
  font-style: italic;
}

.footer-music {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.music-cover {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(120, 160, 80, 0.3), rgba(100, 140, 100, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(80, 120, 60);
}

.music-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.music-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.music-subtitle {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
}

.music-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.music-controls button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.music-controls button:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.7);
}

.music-controls button:active {
  transform: scale(0.92);
}

.play-btn {
  background: rgba(120, 180, 100, 0.15) !important;
  color: rgb(80, 140, 60) !important;
}

.play-btn:hover {
  background: rgba(120, 180, 100, 0.22) !important;
}

.footer-focus {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.focus-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus-icon {
  color: rgb(220, 160, 80);
}

.focus-days {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.4);
}

.focus-number {
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1;
}

.focus-number span {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.4);
}

.focus-next {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
}

.focus-badges {
  display: flex;
  gap: 4px;
}

.focus-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(255, 255, 255, 0.5);
}

/* ===== 进入动画 ===== */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-header {
  animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.stats-row {
  animation: fadeSlideUp 0.5s 0.08s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.middle-row {
  animation: fadeSlideUp 0.5s 0.16s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.bottom-row {
  animation: fadeSlideUp 0.5s 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.dashboard-footer {
  animation: fadeSlideUp 0.5s 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ===== 面板 Hover 微动效 ===== */
.panel {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s ease;
}

.panel:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.35),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

/* ===== TransitionGroup 动画 ===== */
.task-move,
.task-enter-active,
.task-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.task-enter-from,
.task-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.task-leave-active {
  position: absolute;
}

/* ===== 更小屏幕的统计卡片换行 ===== */
@media (max-width: 1100px) {
  .stats-row {
    flex-wrap: wrap;
  }
  .stats-row > * {
    min-width: calc(33.33% - 7px);
    flex: 1 1 calc(33.33% - 7px);
  }
}

@media (max-width: 900px) {
  .personal-panel-desktop {
    display: none;
  }
  .dashboard-main {
    padding: 16px;
  }
}

@media (max-width: 720px) {
  .stats-row > * {
    min-width: calc(50% - 5px);
    flex: 1 1 calc(50% - 5px);
  }
  .dashboard-footer {
    flex-wrap: wrap;
    gap: 10px;
  }
  .footer-music {
    order: -1;
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
