<template>
  <div
    class="glass-card"
    :class="[
      variant === 'light' ? 'bg-glass-bg-light backdrop-blur-lg border-glass-border-light shadow-glass-light' : '',
      variant === 'dark' ? 'bg-glass-bg-dark backdrop-blur-3xl border-glass-border shadow-glass-strong' : '',
      variant === 'default' ? 'bg-glass-bg backdrop-blur-xl border-glass-border shadow-glass' : '',
      roundedClass
    ]"
    :style="{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
      WebkitBackdropFilter: variant === 'dark' ? 'blur(32px)' : 'blur(20px)',
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'light' | 'dark'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  rounded: 'xl'
})

const roundedClass = computed(() => {
  const map: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full'
  }
  return map[props.rounded]
})
</script>

<style scoped>
.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
}
</style>
