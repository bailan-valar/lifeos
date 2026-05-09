<template>
  <div class="week-view">
    <!-- 周统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card income">
        <div class="stat-icon">
          <Icon name="solar:graph-up-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">周收入</span>
          <span class="stat-value">{{ stats.income.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card expense">
        <div class="stat-icon">
          <Icon name="solar:graph-down-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">周支出</span>
          <span class="stat-value">{{ stats.expense.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card net">
        <div class="stat-icon">
          <Icon name="solar:wallet-money-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">周结余</span>
          <span class="stat-value">{{ stats.net.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- 笔记统计 -->
    <div class="note-stats">
      <div class="section-title">笔记统计</div>
      <div class="note-stats-grid">
        <div class="note-stat-card">
          <span class="note-stat-value">{{ weekNoteCount }}</span>
          <span class="note-stat-label">本周新建笔记</span>
        </div>
        <div class="note-stat-card">
          <span class="note-stat-value">{{ totalNoteCount }}</span>
          <span class="note-stat-label">笔记总数</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  weekStart: Date
}>()

const { loadBillStats } = useBills()

const stats = ref({ income: 0, expense: 0, transfer: 0, net: 0 })
const weekNoteCount = ref(0)
const totalNoteCount = ref(0)

function toIso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function toIsoFull(d: Date) {
  return d.toISOString()
}

async function refresh() {
  const start = toIso(props.weekStart)
  const endDate = new Date(props.weekStart)
  endDate.setDate(endDate.getDate() + 6)
  const end = toIso(endDate)

  stats.value = await loadBillStats(undefined, start, end)

  // 查询本周笔记
  const db = await import('~/services/db').then(m => m.getDB())
  const weekStartIso = toIsoFull(new Date(props.weekStart))
  const weekEndIso = toIsoFull(endDate)

  const weekNotesResult = await db.notes.find({
    selector: {
      createdAt: { $gte: weekStartIso, $lte: weekEndIso }
    }
  }).exec()
  weekNoteCount.value = weekNotesResult.length

  const allNotesResult = await db.notes.find({ limit: 99999 }).exec()
  totalNoteCount.value = allNotesResult.length
}

onMounted(async () => {
  await refresh()
})

watch(() => props.weekStart, async () => {
  await refresh()
})
</script>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  transition: background-color 0.15s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.75);
}

.stat-card.income .stat-icon {
  color: rgb(52, 199, 89);
  background: rgba(52, 199, 89, 0.12);
}

.stat-card.expense .stat-icon {
  color: rgb(255, 59, 48);
  background: rgba(255, 59, 48, 0.12);
}

.stat-card.net .stat-icon {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.note-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.note-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.note-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  transition: background-color 0.15s ease;
}

.note-stat-card:hover {
  background: rgba(255, 255, 255, 0.75);
}

.note-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: rgb(0, 122, 255);
}

.note-stat-label {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}
</style>
