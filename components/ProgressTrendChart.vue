<template>
  <div class="progress-trend-chart">
    <div class="chart-header">
      <h3 class="headline">进度趋势</h3>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-dot actual"></div>
          <span class="caption2">实际进度</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot expected"></div>
          <span class="caption2">期望进度</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="chartData.length === 0" class="empty-state">
      <Icon name="solar:chart-linear" size="32" class="empty-icon" />
      <p class="body liquid-text-secondary">暂无进度数据</p>
    </div>

    <div v-else class="chart-container">
      <canvas ref="canvasRef" class="trend-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Goal, ProgressLog } from '~/types/goal'
import { useGoalProgress, formatDate } from '~/composables/useGoalProgress'

const props = defineProps<{
  goal: Goal
  progressLogs: ProgressLog[]
  loading?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement>()
const chartInstance = ref<any>(null)

// 准备图表数据
const chartData = computed(() => {
  if (!props.goal) return []

  const startDate = new Date(props.goal.startDate)
  const endDate = new Date(props.goal.endDate)
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 生成每日数据点
  const data: Array<{
    date: Date
    label: string
    actualProgress: number
    expectedProgress: number
  }> = []

  let cumulativeProgress = 0
  const progressMap = new Map<string, number>()

  // 建立进度记录的映射
  for (const log of props.progressLogs) {
    const logDate = new Date(log.date)
    const dateKey = formatDate(log.date, 'short')
    progressMap.set(dateKey, (progressMap.get(dateKey) || 0) + log.amount)
  }

  // 生成每日数据
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)

    const dateKey = formatDate(currentDate.toISOString(), 'short')
    const dayProgress = progressMap.get(dateKey) || 0
    cumulativeProgress += dayProgress

    // 计算期望进度
    const elapsedDays = i + 1
    const expectedProgress = props.goal.target * (elapsedDays / totalDays)

    data.push({
      date: currentDate,
      label: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
      actualProgress: cumulativeProgress,
      expectedProgress
    })
  }

  return data
})

// 绘制图表
async function renderChart() {
  if (!canvasRef.value || chartData.value.length === 0) return

  // 动态导入Chart.js
  const Chart = await import('chart.js/auto').then(m => m.default)

  // 销毁旧图表
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // 创建渐变
  const actualGradient = ctx.createLinearGradient(0, 0, 0, 300)
  actualGradient.addColorStop(0, 'rgba(52, 199, 89, 0.2)')
  actualGradient.addColorStop(1, 'rgba(52, 199, 89, 0.8)')

  const expectedGradient = ctx.createLinearGradient(0, 0, 0, 300)
  expectedGradient.addColorStop(0, 'rgba(0, 122, 255, 0.1)')
  expectedGradient.addColorStop(1, 'rgba(0, 122, 255, 0.3)')

  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.value.map(d => d.label),
      datasets: [
        {
          label: '实际进度',
          data: chartData.value.map(d => d.actualProgress),
          borderColor: 'rgb(52, 199, 89)',
          backgroundColor: actualGradient,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: '期望进度',
          data: chartData.value.map(d => d.expectedProgress),
          borderColor: 'rgb(0, 122, 255)',
          backgroundColor: expectedGradient,
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0,
          fill: true,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: 'rgba(0, 0, 0, 0.88)',
          bodyColor: 'rgba(0, 0, 0, 0.65)',
          borderColor: 'rgba(60, 60, 67, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const dataset = context.dataset
              const raw = dataset.data[context.dataIndex]
              if (dataset.label === '实际进度') {
                return `${dataset.label}: ${raw.toFixed(0)} ${props.goal?.unit || ''}`
              }
              return `${dataset.label}: ${raw.toFixed(0)}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: 'rgba(60, 60, 67, 0.45)',
            font: { size: 10 },
            maxRotation: 0,
            autoSkipPadding: 10
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(60, 60, 67, 0.08)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(60, 60, 67, 0.45)',
            font: { size: 11 },
            callback: (value) => value.toFixed(0)
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  })
}

// 监听数据变化
watch([chartData, canvasRef], () => {
  if (canvasRef.value) {
    nextTick(() => {
      renderChart()
    })
  }
}, { deep: true })

// 清理
onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
})
</script>

<style scoped>
.progress-trend-chart {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.chart-legend {
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.actual {
  background: rgb(52, 199, 89);
}

.legend-dot.expected {
  background: rgb(0, 122, 255);
}

.chart-container {
  position: relative;
  height: 250px;
}

.loading-state,
.empty-state {
  height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 640px) {
  .chart-container {
    height: 200px;
  }

  .chart-legend {
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }
}
</style>
