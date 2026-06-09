<template>
  <NoteTreePicker
    :model-value="modelValue"
    :notes="convertedNotes"
    :placeholder="placeholder"
    :clearable="clearable"
    @update:model-value="handleUpdate"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import type { Note } from '~/types/block'
import NoteTreePicker from '~/components/NoteTreePicker.vue'

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  modelValue: string
  options: NoteOption[]
  placeholder?: string
  clearable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  'change': [note: Note | null]
}>()

// 将扁平化的 options 还原为 Note 对象格式
// 保留 title 和 id，level 信息由 NoteTreePicker 重建树时使用 parentId 来推断
const convertedNotes = computed(() => {
  // 构建临时映射
  const noteMap = new Map<string, Note>()

  // 首先创建所有节点
  for (const option of props.options) {
    noteMap.set(option.id, {
      id: option.id,
      title: option.title,
      parentId: '',
      order: 0,
      createdAt: '',
      updatedAt: ''
    })
  }

  // 然后根据 level 设置 parentId
  // 通过遍历建立层级关系
  let prevLevel = 0
  let prevId = ''
  const levelStack: string[] = []

  // 按 options 顺序重建父子关系
  for (const option of props.options) {
    const note = noteMap.get(option.id)!
    const currentLevel = option.level

    // 调整栈大小到当前层级
    while (levelStack.length > currentLevel) {
      levelStack.pop()
    }

    // 设置父节点
    if (levelStack.length > 0) {
      note.parentId = levelStack[levelStack.length - 1]
    }

    // 当前节点入栈
    levelStack.push(option.id)
  }

  return Array.from(noteMap.values())
})

function handleUpdate(id: string) {
  emit('update:modelValue', id)
}

function handleChange(note: Note | null) {
  emit('change', note)
}
</script>
