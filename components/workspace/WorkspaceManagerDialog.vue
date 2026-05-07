<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="emitClose">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>工作空间</h3>
            <button class="close-btn" type="button" @click="emitClose">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="ws.list.value.length === 0" class="empty-state">
              <Icon name="solar:folder-open-linear" class="empty-icon" />
              <p>还没有任何工作空间</p>
              <button class="primary-btn" type="button" @click="startCreate">
                <Icon name="solar:add-circle-linear" />
                <span>新建空间</span>
              </button>
            </div>

            <div v-else class="ws-list">
              <div
                v-for="item in ws.list.value"
                :key="item.id"
                class="ws-row"
                :class="{ current: item.id === ws.currentId.value }"
              >
                <div class="ws-row-main" @click="onSwitch(item.id)">
                  <div class="ws-row-icon">
                    <Icon name="solar:folder-2-linear" />
                  </div>
                  <div class="ws-row-meta">
                    <div class="ws-row-name">
                      <span>{{ item.name }}</span>
                      <span v-if="item.id === ws.currentId.value" class="ws-current-pill">当前</span>
                    </div>
                    <div class="ws-row-sub">
                      <SyncStatusBadge
                        v-if="item.id === ws.currentId.value"
                        :status="currentStatus"
                        show-label
                      />
                      <span v-else-if="item.remoteUrl" class="ws-row-remote">
                        <Icon name="solar:cloud-linear" />
                        <span>{{ shortUrl(item.remoteUrl) }}</span>
                      </span>
                      <span v-else class="ws-row-remote muted">
                        <Icon name="solar:cloud-cross-linear" />
                        <span>未配置同步</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="ws-row-actions">
                  <button
                    class="action-btn"
                    type="button"
                    title="编辑"
                    @click.stop="startEdit(item)"
                  >
                    <Icon name="solar:pen-2-linear" />
                  </button>
                  <button
                    class="action-btn danger"
                    type="button"
                    title="删除"
                    :disabled="item.id === ws.currentId.value"
                    @click.stop="onDelete(item)"
                  >
                    <Icon name="solar:trash-bin-trash-linear" />
                  </button>
                </div>
              </div>

              <button class="create-btn" type="button" @click="startCreate">
                <Icon name="solar:add-circle-linear" />
                <span>新建空间</span>
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="ghost-btn" type="button" @click="emitClose">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <WorkspaceFormDialog
    v-model:visible="formVisible"
    :workspace="editingWorkspace"
    @saved="onSaved"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Workspace } from '~/types/workspace'
import { useWorkspaces } from '~/composables/useWorkspaces'
import { useSyncStatus } from '~/composables/useSyncStatus'
import WorkspaceFormDialog from './WorkspaceFormDialog.vue'
import SyncStatusBadge from './SyncStatusBadge.vue'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'

const props = defineProps<{ visible: boolean }>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const ws = useWorkspaces()
const { status: currentStatus } = useSyncStatus()
const { confirm } = useConfirm()
const toast = useToast()

const formVisible = ref(false)
const editingWorkspace = ref<Workspace | null>(null)

function emitClose() {
  emit('update:visible', false)
}

function startCreate() {
  editingWorkspace.value = null
  formVisible.value = true
}

function startEdit(w: Workspace) {
  editingWorkspace.value = w
  formVisible.value = true
}

function onSaved(_w: Workspace) {
  formVisible.value = false
}

async function onSwitch(id: string) {
  if (id === ws.currentId.value) return
  try {
    await ws.switchTo(id)
    toast.success('已切换工作空间')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '切换失败')
  }
}

async function onDelete(w: Workspace) {
  if (w.id === ws.currentId.value) {
    toast.error('请先切换到其他空间再删除当前空间')
    return
  }
  const ok = await confirm({
    title: '删除工作空间',
    message: `确定要删除「${w.name}」吗?该空间的本地数据将一并清除,远端 CouchDB 数据不受影响。`,
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  try {
    await ws.remove(w.id)
    toast.success('空间已删除')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '删除失败')
  }
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.host
  } catch {
    return url
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.modal-content {
  width: 560px;
  max-width: 92vw;
  max-height: 90vh;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: rgba(60, 60, 67, 0.6);
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 32px 12px;
  color: rgba(60, 60, 67, 0.55);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.ws-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ws-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(60, 60, 67, 0.1);
  border-radius: 12px;
  transition: border-color 0.15s, background 0.15s;
}

.ws-row.current {
  border-color: rgba(0, 122, 255, 0.45);
  background: rgba(0, 122, 255, 0.04);
}

.ws-row-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 0;
}

.ws-row-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.ws-row-meta {
  flex: 1;
  min-width: 0;
}

.ws-row-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: -0.01em;
}

.ws-current-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.ws-row-sub {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ws-row-remote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ws-row-remote.muted {
  color: rgba(60, 60, 67, 0.45);
}

.ws-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  border: none;
  background: transparent;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: rgba(120, 120, 128, 0.12);
  color: rgba(0, 0, 0, 0.85);
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed rgba(60, 60, 67, 0.24);
  background: transparent;
  color: rgba(60, 60, 67, 0.7);
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.create-btn:hover {
  background: rgba(120, 120, 128, 0.08);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  background: transparent;
  color: rgba(60, 60, 67, 0.85);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
