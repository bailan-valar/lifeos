<template>
  <div class="stat-card">
    <div class="stat-main">
      <div class="stat-icon-wrap" :style="{ background: iconBg }">
        <Icon :name="icon" size="16" :style="{ color: iconColor }" />
      </div>
      <div class="stat-info">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
        <div class="stat-target">{{ target }}</div>
      </div>
    </div>
    <div class="stat-chart">
      <!-- 柱状图 -->
      <template v-if="chartType === 'bar'">
        <div class="bar-chart">
          <div
            v-for="(h, i) in barData"
            :key="i"
            class="bar"
            :style="{ height: h + '%', background: barColor }"
          />
        </div>
      </template>
      <!-- 环形图 -->
      <template v-else>
        <div class="ring-chart">
          <svg viewBox="0 0 36 36" class="ring-svg">
            <path
              class="ring-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              class="ring-fill"
              :stroke-dasharray="`${ringPercent}, 100`"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              :style="{ stroke: ringColor }"
            />
          </svg>
          <div v-if="ringIcon" class="ring-center">
            <Icon :name="ringIcon" size="12" :style="{ color: ringColor }" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  label: string
  value: string
  target: string
  iconBg: string
  iconColor: string
  chartType: 'bar' | 'ring'
  barData?: number[]
  barColor?: string
  ringPercent?: number
  ringColor?: string
  ringIcon?: string
}

withDefaults(defineProps<Props>(), {
  barData: () => [40, 60, 30, 80, 50, 70, 45],
  barColor: 'rgb(120, 180, 100)',
  ringPercent: 60,
  ringColor: 'rgb(120, 180, 100)',
})
</script>

<style scoped>
.stat-card {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 4px 16px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
  animation: cardPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes cardPopIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.stat-card::before {
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

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-main, .stat-chart {
  position: relative;
  z-index: 1;
}

.stat-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.stat-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.stat-target {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
}

/* 柱状图 */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 28px;
}

.bar {
  width: 4px;
  border-radius: 2px;
  min-height: 3px;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.bar:nth-child(even) {
  opacity: 0.5;
}

/* 环形图 */
.ring-chart {
  position: relative;
  width: 32px;
  height: 32px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(0, 0, 0, 0.06);
  stroke-width: 4;
}

.ring-fill {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
