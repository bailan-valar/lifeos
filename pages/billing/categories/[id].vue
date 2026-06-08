<template>
  <CategoryDetailView :category-id="categoryId" />
</template>

<script setup lang="ts">
import CategoryDetailView from '~/app-modules/billing/components/CategoryDetailView.vue'

const route = useRoute()
const categoryId = computed(() => route.params.id as string)
</script>
