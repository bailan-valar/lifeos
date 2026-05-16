<template>
  <aside class="personal-panel">
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="panel-title-wrap">
        <Icon name="solar:leaf-linear" size="18" class="panel-icon" />
        <div>
          <div class="panel-title">个人面板</div>
          <div class="panel-subtitle">Personal Panel</div>
        </div>
      </div>
    </div>

    <!-- 用户信息 -->
    <div class="user-info">
      <div class="avatar-wrap">
        <div class="avatar-ring">
          <div class="avatar">
            <Icon name="solar:user-linear" size="32" />
          </div>
        </div>
      </div>
      <div class="user-name">
        Shirley <Icon name="solar:leaf-linear" size="14" class="name-icon" />
      </div>
      <div class="user-role">研究者 · 设计师 · 探索者</div>

      <!-- 等级 -->
      <div class="level-row">
        <span class="level-text">Lv. 27</span>
        <div class="exp-bar">
          <div class="exp-fill" style="width: 62%" />
        </div>
        <span class="exp-text">EXP 3260 / 5200</span>
      </div>

      <!-- 座右铭 -->
      <div class="motto">
        「持续成长，温柔坚定。<br>用设计与研究，连接人与情感。」
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="nav-menu">
      <div
        v-for="item in menuItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeItem === item.id }"
        @click="activeItem = item.id"
      >
        <Icon :name="item.icon" size="18" />
        <span>{{ item.label }}</span>
        <Icon v-if="item.children" name="solar:alt-arrow-right-linear" size="14" class="nav-arrow" />
      </div>
    </nav>

    <!-- 底部机器人 -->
    <div class="robot-assistant">
      <div class="robot-bubble">
        <div class="robot-avatar">
          <Icon name="solar:ghost-linear" size="20" />
        </div>
        <div class="robot-text">
          <div class="robot-greeting">Hi Shirley!</div>
          <div class="robot-hint">今天也要好好照顾自己哦~<br>需要我陪你一起专注吗？</div>
        </div>
      </div>
      <button class="robot-btn">
        <Icon name="solar:play-circle-linear" size="14" />
        开启专注模式
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeItem = ref('overview')

const menuItems = [
  { id: 'overview', label: '今日概览', icon: 'solar:home-2-linear' },
  { id: 'tasks', label: '任务中心', icon: 'solar:checklist-linear', children: true },
  { id: 'research', label: '研究与项目', icon: 'solar:folder-linear', children: true },
  { id: 'skills', label: '技能成长', icon: 'solar:chart-linear', children: true },
  { id: 'emotion', label: '情绪与能量', icon: 'solar:heart-linear', children: true },
  { id: 'achievements', label: '成就收集', icon: 'solar:medal-ribbon-linear', children: true },
  { id: 'library', label: '资料库', icon: 'solar:library-linear', children: true },
  { id: 'settings', label: '设置', icon: 'solar:settings-linear' },
]
</script>

<style scoped>
.personal-panel {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-right: 0.5px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.3),
    4px 0 24px rgba(0, 0, 0, 0.06);
  overflow-y: auto;
  position: relative;
  animation: panelSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.personal-panel::-webkit-scrollbar {
  width: 4px;
}
.personal-panel::-webkit-scrollbar-track {
  background: transparent;
}
.personal-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
}
.personal-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.12);
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.personal-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 0% 0%,
    rgba(255, 255, 255, 0.35) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.panel-header {
  position: relative;
  z-index: 1;
}

.panel-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  color: rgb(120, 160, 80);
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  letter-spacing: -0.02em;
}

.panel-subtitle {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: 0.02em;
}

/* 用户信息 */
.user-info {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.avatar-wrap {
  position: relative;
}

.avatar-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, rgba(120, 160, 80, 0.4), rgba(180, 140, 100, 0.3));
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(200, 180, 160, 0.5), rgba(180, 160, 140, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  gap: 3px;
}

.name-icon {
  color: rgb(120, 160, 80);
}

.user-role {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
}

.level-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.level-text {
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
}

.exp-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(120, 180, 100), rgb(160, 210, 120));
  border-radius: 3px;
}

.exp-text {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.35);
}

.motto {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
  text-align: center;
  line-height: 1.5;
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
}

/* 导航菜单 */
.nav-menu {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.75);
}

.nav-item.active {
  background: rgba(120, 160, 80, 0.1);
  color: rgb(90, 130, 60);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: rgb(120, 160, 80);
  border-radius: 0 3px 3px 0;
}

.nav-arrow {
  margin-left: auto;
  color: rgba(0, 0, 0, 0.25);
}

/* 机器人助手 */
.robot-assistant {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 8px;
}

.robot-bubble {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.robot-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(120, 160, 80, 0.3), rgba(100, 140, 180, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(80, 120, 60);
  flex-shrink: 0;
}

.robot-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.robot-greeting {
  font-size: 11px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.75);
}

.robot-hint {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.robot-btn {
  margin-top: 6px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: rgba(120, 160, 80, 0.15);
  color: rgb(80, 120, 60);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 0.5px solid rgba(120, 160, 80, 0.2);
}

.robot-btn:hover {
  background: rgba(120, 160, 80, 0.22);
}

.robot-btn:active {
  transform: scale(0.97);
}
</style>
