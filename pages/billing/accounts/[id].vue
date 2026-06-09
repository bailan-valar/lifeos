<template>
  <AccountDetailView :account-id="accountId" />
</template>

<script setup lang="ts">
import AccountDetailView from '~/app-modules/billing/components/AccountDetailView.vue'

const route = useRoute()
const accountId = computed(() => route.params.id as string)
</script>
