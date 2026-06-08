<template>
  <div
    class="learning-session-item"
    :class="{ completed: session.completed, expanded: isExpanded }"
    @click="toggleExpand"
  >
    <div class="session-header">
      <button class="check-btn" :class="{ checked: session.completed }" @click.stop="toggleComplete">
        <Icon :name="session.completed ? SOLAR_ICONS.status.success : SOLAR_ICONS.action.circle" />
      </button>

      <div class="session-info">
        <span class="session-no">第{{ session.sessionNo }}课</span>
        <h4 class="session-title">{{ session.title }}</h4>
      </div>

      <button class="expand-btn">
        <Icon :name="isExpanded ? SOLAR_ICONS.nav.up : SOLAR_ICONS.nav.down" />
      </button>
    </div>

    <div v-if="isExpanded" class="session-body">
      <div class="session-section learn">
        <div class="section-label">
          <Icon :name="SOLAR_ICONS.doc.text" />
          <span>学习内容</span>
        </div>
        <p>{{ session.learn }}</p>
      </div>

      <div class="session-section practice">
        <div class="section-label">
          <Icon :name="SOLAR_ICONS.action.edit" />
          <span>实战练习</span>
        </div>
        <p>{{ session.practice }}</p>
      </div>

      <div v-if="session.notes" class="session-notes">
        <div class="section-label">
          <Icon :name="SOLAR_ICONS.doc.notebook" />
          <span>我的笔记</span>
        </div>
        <p>{{ session.notes }}</p>
      </div>

      <button class="add-notes-btn" @click.stop="showNotesDialog">
        <Icon :name="SOLAR_ICONS.action.edit" />
        <span>{{ session.notes ? '编辑笔记' : '添加笔记' }}</span>
      </button>
    </div>

    <div v-if="session.completedAt" class="completion-info">
      <Icon :name="SOLAR_ICONS.time.clock" />
      <span>完成于 {{ formatDate(session.completedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { LearningSession } from '~/types/goal'
import { SOLAR_ICONS } from '~/composables/useIcons'

const props = defineProps<{
  session: LearningSession
}>()

const emit = defineEmits<{
  toggleComplete: [session: LearningSession]
  editNotes: [session: LearningSession]
}>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function toggleComplete() {
  emit('toggleComplete', props.session)
}

function showNotesDialog() {
  emit('editNotes', props.session)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.learning-session-item {
  background: var(--liquid-bg-thin);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  overflow: hidden;
  transition: all 0.2s;
}

.learning-session-item:hover {
  border-color: rgba(102, 126, 234, 0.3);
}

.learning-session-item.completed {
  opacity: 0.7;
}

.learning-session-item.completed .session-title {
  text-decoration: line-through;
  color: var(--text-secondary, #666);
}

.session-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
}

.check-btn {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  padding: 0;
  border: 2px solid rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.check-btn:hover {
  border-color: #667eea;
}

.check-btn.checked {
  border-color: #4ade80;
  background: #4ade80;
}

.check-btn .icon {
  font-size: 14px;
  color: white;
}

.check-btn:not(.checked) .icon {
  color: var(--text-secondary, #666);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-no {
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
}

.session-title {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expand-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #666);
  transition: transform 0.2s;
}

.expand-btn .icon {
  font-size: 16px;
}

.session-body {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.session-section {
  margin-top: 14px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.section-label .icon {
  font-size: 14px;
}

.learn .section-label {
  color: #667eea;
}

.practice .section-label {
  color: #f59e0b;
}

.session-section p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #1a1a1a);
}

.session-notes {
  margin-top: 12px;
  padding: 10px;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 8px;
}

.session-notes .section-label {
  color: #667eea;
}

.add-notes-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.add-notes-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: #667eea;
  color: #667eea;
}

.add-notes-btn .icon {
  font-size: 14px;
}

.completion-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 11px;
  color: #16a34a;
  background: rgba(74, 222, 128, 0.1);
}

.completion-info .icon {
  font-size: 12px;
}

@media (prefers-color-scheme: dark) {
  .learning-session-item {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .session-header {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .session-body {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .check-btn {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .add-notes-btn {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
