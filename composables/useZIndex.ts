import { ref, watch, computed } from 'vue'
import type { Ref } from 'vue'

let nextZIndex = 2000

export function getNextZIndex(): number {
  return nextZIndex++
}

export function useZIndexOnOpen(isOpen: Ref<boolean> | (() => boolean)) {
  const zIndex = ref<number | undefined>(undefined)
  const open = typeof isOpen === 'function' ? computed(isOpen) : isOpen
  watch(open, (v) => {
    if (v) zIndex.value = getNextZIndex()
  }, { immediate: true })
  return zIndex
}
