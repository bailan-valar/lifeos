<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="emitClose">
        <div class="modal-content" :class="{ mobile: isMobile }" @click.stop>
          <div class="modal-header">
            <h3>{{ isEdit ? '编辑工作空间' : '新建工作空间' }}</h3>
            <button class="close-btn" type="button" @click="emitClose">
              <Icon name="solar:close-circle-linear" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="isEdit" class="form-group">
              <label>空间 ID</label>
              <input
                :value="props.workspace?.id"
                type="text"
                class="form-input readonly"
                readonly
              />
            </div>

            <div class="form-group">
              <label>名称 <span class="required">*</span></label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="工作空间名称"
                maxlength="40"
              />
            </div>

            <label v-if="canShowRemote" class="checkbox-row">
              <input v-model="showRemote" type="checkbox" />
              <span>自定义同步配置</span>
            </label>

            <template v-if="showRemote">
              <div class="form-group">
                <label>CouchDB 地址</label>
                <input
                  v-model="form.remoteUrl"
                  type="text"
                  class="form-input"
                  placeholder="https://user:pass@host:5984"
                />
                <p class="hint">留空则不启用同步,可在多设备间相互独立。</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>用户名</label>
                  <input
                    v-model="form.remoteUsername"
                    type="text"
                    class="form-input"
                    placeholder="admin"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>密码</label>
                  <input
                    v-model="form.remotePassword"
                    type="password"
                    class="form-input"
                    placeholder="••••••"
                    autocomplete="new-password"
                  />
                </div>
              </div>
              <p class="hint">用于 CouchDB Basic 认证,留空则匿名访问。</p>

              <div class="form-group">
                <label>远端 DB 前缀</label>
                <input
                  v-model="form.remotePrefix"
                  type="text"
                  class="form-input"
                  placeholder="lifeos-"
                />
                <p class="hint">远端 db 名 = 前缀 + 集合名,默认 <code>lifeos-</code>。</p>
              </div>

              <div class="test-row">
                <button class="ghost-btn" type="button" :disabled="testing" @click="onTest">
                  <Icon name="solar:link-circle-linear" />
                  <span>{{ testing ? '测试中…' : '测试连接' }}</span>
                </button>
                <span v-if="testResult" class="test-result" :class="testResult.ok ? 'ok' : 'bad'">
                  {{ testResult.ok ? '连接成功' : testResult.error }}
                </span>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="ghost-btn" type="button" @click="emitClose">取消</button>
            <button
              class="primary-btn"
              type="button"
              :disabled="!canSubmit || submitting"
              @click="onSubmit"
            >
              <Icon name="solar:check-circle-linear" />
              <span>{{ submitting ? '保存中…' : '保存' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { Workspace, WorkspaceFormData } from '~/types/workspace'
import { useWorkspaces } from '~/composables/useWorkspaces'
import { useAuthStore } from '~/stores/auth'
import { testRemote } from '~/services/sync'
import { useZIndexOnOpen } from '~/composables/useZIndex'

const { isMobile } = useDevice()

const props = defineProps<{
  visible: boolean
  workspace?: Workspace | null
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'saved', ws: Workspace): void
}>()

const isEdit = computed(() => !!props.workspace?.id)

const form = reactive<WorkspaceFormData>({
  name: '',
  remoteUrl: '',
  remoteUsername: '',
  remotePassword: '',
  remotePrefix: 'lifeos-'
})

const submitting = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: true } | { ok: false; error: string } | null>(null)
const showRemote = ref(false)

watch(
  () => [props.visible, props.workspace],
  ([v]) => {
    if (v) {
      form.name = props.workspace?.name || ''
      form.remoteUrl = props.workspace?.remoteUrl || ''
      form.remoteUsername = props.workspace?.remoteUsername || ''
      form.remotePassword = props.workspace?.remotePassword || ''
      form.remotePrefix = props.workspace?.remotePrefix || 'lifeos-'
      showRemote.value = !!(
        props.workspace?.remoteUrl ||
        props.workspace?.remoteUsername ||
        props.workspace?.remotePassword
      )
      testResult.value = null
    }
  },
  { immediate: true }
)

const canSubmit = computed(() => form.name.trim().length > 0)

const ws = useWorkspaces()
const authStore = useAuthStore()
const canShowRemote = computed(() => !!authStore.user)

function emitClose() {
  emit('update:visible', false)
}

async function onTest() {
  if (!form.remoteUrl?.trim()) {
    testResult.value = { ok: false, error: '请输入 CouchDB 地址' }
    return
  }
  testing.value = true
  try {
    const username = form.remoteUsername?.trim() || undefined
    const password = form.remotePassword?.length ? form.remotePassword : undefined
    testResult.value = await testRemote(form.remoteUrl.trim(), { username, password })
  } finally {
    testing.value = false
  }
}

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const payload: WorkspaceFormData = { ...form }
    if (!showRemote.value || !canShowRemote.value) {
      payload.remoteUrl = ''
      payload.remoteUsername = ''
      payload.remotePassword = ''
      payload.remotePrefix = 'lifeos-'
    }
    let saved: Workspace
    if (isEdit.value && props.workspace) {
      saved = await ws.update(props.workspace.id, payload)
    } else {
      saved = await ws.create(payload)
    }
    emit('saved', saved)
    emitClose()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}
.modal-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}
.modal-content {
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-content.mobile {
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
  overflow: hidden;
}

.modal-body {
  flex: 1;
  min-height: 0;
}

.modal-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.modal-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.7);
}

.required {
  color: rgb(255, 59, 48);
}

.form-input {
  border: 1px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: rgba(255, 255, 255, 0.6);
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: rgb(0, 122, 255);
}

.hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
  margin: 0;
}

.hint code {
  background: rgba(120, 120, 128, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.test-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-result {
  font-size: 12px;
}

.test-result.ok {
  color: rgb(52, 199, 89);
}

.test-result.bad {
  color: rgb(255, 59, 48);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
  flex-shrink: 0;
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

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.85);
  cursor: pointer;
  user-select: none;
}

.checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}

.form-input.readonly {
  background: rgba(120, 120, 128, 0.08);
  color: rgba(60, 60, 67, 0.55);
  cursor: default;
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
