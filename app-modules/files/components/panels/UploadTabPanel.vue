<template>
  <div class="upload-tab-panel">
    <!-- 上传区域 -->
    <div class="upload-area">
      <div
        class="drop-zone"
        :class="{ 'drag-over': isDragOver }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <Icon name="solar:cloud-upload-linear" size="64" />
        <div class="drop-zone-title">拖拽文件到此处上传</div>
        <div class="drop-zone-desc">或点击选择文件</div>
        <div class="drop-zone-limit">支持单个文件最大 100MB</div>

        <input
          ref="fileInput"
          type="file"
          multiple
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- 上传列表 -->
    <div v-if="uploadTasks.length > 0" class="upload-list">
      <div class="list-header">
        <span>上传队列 ({{ uploadTasks.length }})</span>
      </div>

      <div class="upload-items">
        <div
          v-for="task in uploadTasks"
          :key="task.id"
          class="upload-item"
        >
          <div class="item-icon">
            <Icon :name="getFileIcon(task)" size="32" />
          </div>

          <div class="item-info">
            <div class="item-name">{{ task.name }}</div>
            <div class="item-meta">
              <span v-if="task.status === 'uploading'">
                上传中... {{ task.progress }}%
              </span>
              <span v-else-if="task.status === 'completed'">
                上传完成
              </span>
              <span v-else-if="task.status === 'error'">
                上传失败: {{ task.error }}
              </span>
              <span v-else>
                {{ formatFileSize(task.size) }}
              </span>
            </div>
          </div>

          <div class="item-actions">
            <button
              v-if="task.status === 'uploading'"
              type="button"
              class="action-btn"
              @click="cancelUpload(task.id)"
            >
              <Icon name="solar:close-circle-linear" size="18" />
            </button>
            <button
              v-else-if="task.status === 'error'"
              type="button"
              class="action-btn"
              @click="retryUpload(task)"
            >
              <Icon name="solar:refresh-linear" size="18" />
            </button>
            <button
              v-else-if="task.status === 'completed'"
              type="button"
              class="action-btn success"
            >
              <Icon name="solar:check-circle-linear" size="18" />
            </button>
          </div>

          <!-- 进度条 -->
          <div v-if="task.status === 'uploading'" class="progress-bar">
            <div class="progress-fill" :style="{ width: task.progress + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <Icon name="solar:upload-linear" size="48" />
      <div class="empty-title">暂无上传任务</div>
      <div class="empty-desc">拖拽文件到上方区域开始上传</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileUploadTask } from '~/types/file'
import { ref } from 'vue'

const props = defineProps<{
  uploadTasks: FileUploadTask[]
}>()

const emit = defineEmits<{
  (e: 'upload-start', task: FileUploadTask): void
  (e: 'upload-cancel', taskId: string): void
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function handleDragOver(e: DragEvent) {
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
  // 重置input以允许再次选择同一文件
  target.value = ''
}

function handleFiles(files: FileList) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const task: FileUploadTask = {
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading',
      folderId: 'root', // 默认上传到根目录
      noteId: '', // 需要从外部传入
      createdAt: new Date().toISOString(),
    }

    emit('upload-start', task)
  }
}

function cancelUpload(taskId: string) {
  emit('upload-cancel', taskId)
}

function retryUpload(task: FileUploadTask) {
  // 重试上传
  task.status = 'uploading'
  task.progress = 0
  task.error = undefined
  emit('upload-start', task)
}

function getFileIcon(task: FileUploadTask): string {
  const iconMap: Record<string, string> = {
    'image/': 'solar:gallery-linear',
    'video/': 'solar:videocamera-linear',
    'audio/': 'solar:music-linear',
    'application/pdf': 'solar:document-linear',
    'application/zip': 'solar:zip-file-linear',
    'text/': 'solar:document-text-linear',
  }

  for (const [prefix, icon] of Object.entries(iconMap)) {
    if (task.type.startsWith(prefix)) {
      return icon
    }
  }

  return 'solar:file-linear'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.upload-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 24px;
}

.upload-area {
  margin-bottom: 24px;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(0, 0, 0, 0.6);
}

.drop-zone:hover {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
}

.drop-zone.drag-over {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.1);
  transform: scale(1.02);
}

.drop-zone svg {
  margin-bottom: 16px;
  color: rgba(0, 0, 0, 0.4);
}

.drop-zone-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

.drop-zone-desc {
  font-size: 14px;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.6);
}

.drop-zone-limit {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.upload-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.upload-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.upload-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.upload-item:hover {
  background: white;
  border-color: rgba(0, 0, 0, 0.1);
}

.item-icon {
  margin-right: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.item-actions {
  margin-left: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.8);
}

.action-btn.success {
  color: rgb(52, 199, 89);
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(0, 122, 255), rgb(88, 86, 214));
  transition: width 0.3s ease;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.4);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
}
</style>
