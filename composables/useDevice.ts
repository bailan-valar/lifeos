import { ref, readonly, computed, onMounted, onUnmounted } from 'vue'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useDevice() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : TABLET_BREAKPOINT + 1)

  const isMobile = computed(() => width.value < MOBILE_BREAKPOINT)
  const isTablet = computed(() => width.value >= MOBILE_BREAKPOINT && width.value < TABLET_BREAKPOINT)
  const isDesktop = computed(() => width.value >= TABLET_BREAKPOINT)
  const isTouch = computed(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))

  function onResize() {
    width.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  return {
    width: readonly(width),
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
  }
}
