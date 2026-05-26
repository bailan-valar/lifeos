<template>
  <div class="goal-statistics-panel">
    <!-- 头部 -->
    <div class="header liquid-glass-nav">
      <div class="header-left">
        <h2 class="title2">目标统计</h2>
        <p class="body2 liquid-text-secondary">查看目标完成情况和趋势分析</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span class="subheadline">加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="goals.length === 0" class="empty-state">
      <Icon name="solar:chart-linear" size="48" class="empty-icon" />
      <h3 class="title3">暂无数据</h3>
      <p class="body liquid-text-secondary">创建目标后可查看统计数据</p>
    </div>

    <!-- 统计内容 -->
    <div v-else class="statistics-content">
      <!-- 总览卡片 -->
      <div class="overview-cards">
        <div class="stat-card liquid-glass-card">
          <div class="stat-icon" style="background: rgba(0, 122, 255, 0.1); color: rgb(0, 122, 255);">
            <Icon name="solar:target-linear" size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value headline">{{ totalGoals }}</div>
            <div class="stat-label caption1 liquid-text-secondary">总目标数</div>
          </div>
        </div>

        <div class="stat-card liquid-glass-card">
          <div class="stat-icon" style="background: rgba(52, 199, 89, 0.1); color: rgb(52, 199, 89);">
            <Icon name="solar:check-circle-linear" size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value headline">{{ completedGoals }}</div>
            <div class="stat-label caption1 liquid-text-secondary">已完成</div>
          </div>
        </div>

        <div class="stat-card liquid-glass-card">
          <div class="stat-icon" style="background: rgba(255, 149, 0, 0.1); color: rgb(255, 149, 0);">
            <Icon name="solar:clock-circle-linear" size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value headline">{{ inProgressGoals }}</div>
            <div class="stat-label caption1 liquid-text-secondary">进行中</div>
          </div>
        </div>

        <div class="stat-card liquid-glass-card">
          <div class="stat-icon" style="background: rgba(175, 82, 222, 0.1); color: rgb(175, 82, 222);">
            <Icon name="solar:chart-linear" size="24" />
          </div>
          <div class="stat-content">
            <div class="stat-value headline">{{ averageProgress }}%</div>
            <div class="stat-label caption1 liquid-text-secondary">平均进度</div>
          </div>
        </div>
      </div>

      <!-- 类型分布 -->
      <div class="chart-card liquid-glass-card">
        <h3 class="title3">类型分布</h3>
        <div class="type-stats">
          <div
            v-for="typeStat in typeStatistics"
            :key="typeStat.type"
            class="type-stat-item"
          >
            <div class="type-header">
              <span class="type-dot" :style="{ background: typeStat.color }"></span>
              <span class="type-name">{{ typeStat.name }}</span>
              <span class="type-count">{{ typeStat.count }}</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: (typeStat.count / totalGoals * 100) + '%',
                  background: typeStat.color
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 进度状态分布 -->
      <div class="chart-card liquid-glass-card">
        <h3 class="title3">进度状态分布</h3>
        <div class="progress-stats">
          <div
            v-for="progressStat in progressStatistics"
            :key="progressStat.status"
            class="progress-stat-item"
          >
            <div class="stat-header">
              <span class="stat-name">{{ progressStat.name }}</span>
              <span class="stat-count">{{ progressStat.count }}</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: (progressStat.count / totalGoals * 100) + '%',
                  background: progressStat.color
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Goal } from '~/types/goal'
import { useGoalProgress } from '~/composables/useGoalProgress'

const { goals, loading, loadGoals, calculateProgressStatistics } = useGoalProgress()

// 类型配置
const typeConfigs = [
  { type: 'short_term', name: '短期目标', color: '#34C759' },
  { type: 'long_term', name: '长期目标', color: '#FF9500' },
  { type: 'habit', name: '习惯养成', color: '#AF52DE' },
  { type: 'project', name: '项目任务', color: '#FF3B30' }
]

// 进度状态配置
const progressConfigs = [
  { status: 'completed', name: '已完成', color: '#34C759' },
  { status: 'ahead', name: '超前', color: '#5AC8FA' },
  { status: 'on_track', name: '正常', color: '#007AFF' },
  { status: 'behind', name: '落后', color: '#FF9500' }
]

// 统计数据
const totalGoals = computed(() => goals.value.length)

const completedGoals = computed(() => {
  return goals.value.filter(goal => {
    const stats = calculateProgressStatistics(goal)
    return stats.progressStatus === 'completed'
  }).length
})

const inProgressGoals = computed(() => {
  return goals.value.filter(goal => {
    const stats = calculateProgressStatistics(goal)
    return stats.progressStatus !== 'completed'
  }).length
})

const averageProgress = computed(() => {
  if (goals.value.length === 0) return 0
  const totalPercentage = goals.value.reduce((sum, goal) => {
    return sum + calculateProgressStatistics(goal).percentage
  }, 0)
  return Math.round(totalPercentage / goals.value.length)
})

// 类型统计
const typeStatistics = computed(() => {
  return typeConfigs.map(config => {
    const count = goals.value.filter(g => g.type === config.type).length
    return { ...config, count }
  }).filter(stat => stat.count > 0)
})

// 进度状态统计
const progressStatistics = computed(() => {
  return progressConfigs.map(config => {
    const count = goals.value.filter(goal => {
      const stats = calculateProgressStatistics(goal)
      return stats.progressStatus === config.status
    }).length
    return { ...config, count }
  }).filter(stat => stat.count > 0)
})

// 生命周期
onMounted(async () => {
  await loadGoals()
})
</script>

<style scoped>
.goal-statistics-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
}

/* 头部 */
.header {
  padding: 16px;
  border-radius: var(--liquid-radius);
}

.header-left h2 {
  margin: 0 0 4px 0;
  color: var(--liquid-text-primary);
}

.header-left p {
  margin: 0;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

/* 统计内容 */
.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 总览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--liquid-radius);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.stat-label {
  color: var(--liquid-text-secondary);
}

/* 图表卡片 */
.chart-card {
  padding: 20px;
  border-radius: var(--liquid-radius);
}

.chart-card h3 {
  margin: 0 0 16px 0;
  color: var(--liquid-text-primary);
}

/* 类型统计 */
.type-stats,
.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-stat-item,
.progress-stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-header,
.stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.type-name,
.stat-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.type-count,
.stat-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

/* 响应式 */
@media (max-width: 640px) {
  .goal-statistics-panel {
    padding: 8px;
    gap: 8px;
  }

  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
  }

  .chart-card {
    padding: 16px;
  }
}
</style>