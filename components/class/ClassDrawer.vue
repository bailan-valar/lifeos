<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="$emit('update:visible', false)">
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <template v-if="noteClassData">
              <div class="class-badge" :style="{ background: noteClassData.class.color + '18', color: noteClassData.class.color }">
                <Icon :name="noteClassData.class.icon" />
                <span>{{ noteClassData.class.name }}</span>
              </div>
              <div class="drawer-actions">
                <button class="action-btn" @click="editCurrentClass" type="button" title="编辑类">
                  <Icon name="solar:pen-2-linear" />
                </button>
                <button class="action-btn" @click="unbind" type="button" title="移除类">
                  <Icon name="solar:trash-bin-trash-linear" />
                </button>
                <button class="action-btn" @click="$emit('update:visible', false)" type="button" title="关闭">
                  <Icon name="solar:close-circle-linear" />
                </button>
              </div>
            </template>
            <template v-else>
              <h3>属性</h3>
              <button class="action-btn" @click="$emit('update:visible', false)" type="button" title="关闭">
                <Icon name="solar:close-circle-linear" />
              </button>
            </template>
          </div>

          <div class="drawer-body">
            <template v-if="noteClassData">
              <div class="fields-form">
                <FieldEditor
                  v-for="field in noteClassData.fields"
                  :key="field.id"
                  :field="field"
                  :model-value="fieldValues[field.id]"
                  :label="field.name"
                  @update:model-value="updateFieldValue(field.id, $event)"
                />
              </div>
            </template>

            <template v-else>
              <div v-if="classes.length === 0" class="empty-state">
                <Icon name="solar:folder-open-linear" class="empty-icon" />
                <p>还没有创建任何类</p>
                <button class="primary-btn" @click="openCreateClass" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>去创建</span>
                </button>
              </div>

              <div v-else class="bind-section">
                <p class="bind-hint">为此笔记绑定一个类：</p>
                <div class="class-options">
                  <button
                    v-for="cls in classes"
                    :key="cls.id"
                    class="class-option"
                    :style="{ borderLeftColor: cls.color }"
                    @click="bind(cls.id)"
                    type="button"
                  >
                    <div class="option-icon" :style="{ background: cls.color + '18', color: cls.color }">
                      <Icon :name="cls.icon" />
                    </div>
                    <div class="option-info">
                      <div class="option-name">{{ cls.name }}</div>
                      <div v-if="cls.description" class="option-desc">{{ cls.description }}</div>
                    </div>
                  </button>
                </div>
                <button class="create-class-btn" @click="openCreateClass" type="button">
                  <Icon name="solar:add-circle-linear" />
                  <span>创建新类</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Class, ClassField, NoteClassBinding } from '~/types/block'
import FieldEditor from './FieldEditor.vue'
import { useZIndexOnOpen } from '~/composables/useZIndex'

interface Props {
  visible: boolean
  noteId: string
  userId: string
}

const props = defineProps<Props>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const openClassManager = inject<(mode: 'list' | 'create' | 'edit', cls?: any, options?: { onCreated?: (classId: string) => void }) => void>('openClassManager', () => {})

const {
  classes,
  classFields,
  noteBindings,
  loadClasses,
  loadBindings,
  bindClass,
  unbindClass,
  updateBindingValues,
  lastCreatedClassId
} = useNoteClasses()

const noteClassData = computed(() => {
  const binding = noteBindings.value.find(b => b.noteId === props.noteId)
  if (!binding) return null
  const cls = classes.value.find(c => c.id === binding.classId)
  if (!cls) return null
  const fields = classFields.value
    .filter(f => f.classId === cls.id)
    .sort((a, b) => a.order - b.order)
  return { class: cls, fields, binding }
})

const fieldValues = ref<Record<string, any>>({})
let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(noteClassData, (data) => {
  if (data) {
    fieldValues.value = { ...data.binding.values }
  } else {
    fieldValues.value = {}
  }
}, { immediate: true })

const updateFieldValue = (fieldId: string, value: any) => {
  fieldValues.value[fieldId] = value
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await updateBindingValues(props.noteId, { ...fieldValues.value })
  }, 300)
}

const bind = async (classId: string) => {
  await bindClass(props.noteId, classId)
}

const unbind = async () => {
  await unbindClass(props.noteId)
}

const openCreateClass = () => {
  openClassManager('create')
}

const editCurrentClass = () => {
  if (noteClassData.value) {
    openClassManager('edit', noteClassData.value.class)
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    loadClasses(props.userId)
    loadBindings()
  }
})

watch(lastCreatedClassId, async (classId) => {
  if (classId && props.visible && props.noteId) {
    await bindClass(props.noteId, classId)
    lastCreatedClassId.value = null
  }
})
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 320px;
  height: calc(100% - 48px);
  margin-top: 48px;
  background: rgba(255, 255, 255, 0.75);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-left: 0.5px solid rgba(60, 60, 67, 0.08);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  min-height: 56px;
}

.drawer-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.class-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}

.drawer-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s ease, color 0.15s ease;
}

.action-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.85);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.fields-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 16px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  color: rgba(60, 60, 67, 0.3);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.55);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
}

.bind-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bind-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}

.class-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.class-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.08);
  border-left: 3px solid;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, transform 0.1s ease;
}

.class-option:hover {
  background: rgba(255, 255, 255, 0.75);
  transform: translateX(-2px);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 16px;
  flex-shrink: 0;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.option-desc {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.create-class-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(60, 60, 67, 0.2);
  border-radius: 14px;
  color: rgba(0, 122, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.create-class-btn:hover {
  background: rgba(0, 122, 255, 0.06);
  border-color: rgba(0, 122, 255, 0.3);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
