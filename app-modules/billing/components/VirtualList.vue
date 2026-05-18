<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: `${containerHeight}px` }"
    @scroll="onScroll"
  >
    <div class="virtual-list-spacer" :style="{ height: `${totalHeight}px` }">
      <div
        v-for="item in visibleItems"
        :key="item.index"
        class="virtual-list-item"
        :style="{ transform: `translateY(${item.offset}px)` }"
      >
        <slot
          :item="items[item.index]"
          :index="item.index"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  items: any[]
  itemHeight: number
  containerHeight: number
  buffer?: number
  gap?: number
}>()

interface VisibleItem {
  index: number
  offset: number
}

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

const buffer = computed(() => props.buffer || 3)
const gap = computed(() => props.gap || 0)

// 每项占用的总高度（内容高度 + 间距）
const itemTotalHeight = computed(() => props.itemHeight + gap.value)

const totalHeight = computed(() => {
  if (props.items.length === 0) return 0
  return props.items.length * props.itemHeight + (props.items.length - 1) * gap.value
})

const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / itemTotalHeight.value) - buffer.value)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(props.containerHeight / itemTotalHeight.value)
  return Math.min(props.items.length - 1, startIndex.value + visibleCount + buffer.value * 2)
})

const visibleItems = computed((): VisibleItem[] => {
  const result: VisibleItem[] = []
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    result.push({
      index: i,
      offset: i * itemTotalHeight.value
    })
  }
  return result
})

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}

// 暴露滚动到指定项的方法
function scrollToItem(index: number) {
  if (!containerRef.value) return
  const targetScrollTop = index * itemTotalHeight.value - props.containerHeight / 2 + props.itemHeight / 2
  containerRef.value.scrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight.value - props.containerHeight))
}

defineExpose({ scrollToItem })
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-list-spacer {
  position: relative;
}

.virtual-list-item {
  position: absolute;
  left: 0;
  right: 0;
}
</style>
